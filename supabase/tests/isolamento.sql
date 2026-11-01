-- Teste de isolamento entre profissionais.
-- Roda dentro de uma transação e desfaz tudo no fim (rollback).
-- Uso: SQL Editor do Supabase, ou `npm run test:db` (PGlite local).
-- Qualquer falha interrompe com "ISOLAMENTO FALHOU: ...".

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'bia@teste.local');

-- Profissional A cria dados ---------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

insert into public.clientes (id, nome, telefone)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Cliente da Ana', '5511999990001');
insert into public.pacotes (id, cliente_id, total_sessoes, valor_centavos, validade_ate, regra_cancelamento)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 10, 90000, current_date + 90, 'regra');
insert into public.sessoes (cliente_id, pacote_id, inicio, situacao)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', now(), 'feita');
insert into public.eventos (cliente_id, entidade, tipo, descricao)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'cliente', 'criou', 'teste');

-- Agenda: serviço, semana padrão e trava de conflito ----------------------------
insert into public.servicos (id, nome, duracao_min, preco_centavos)
  values ('aaaaaaaa-0000-0000-0000-000000000003', 'Massagem relaxante', 60, 12000);
insert into public.sessoes (cliente_id, servico_id, inicio, duracao_min, intervalo_min)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', '2030-01-07 12:00:00+00', 60, 15);

do $$ begin
  assert (select count(*) from public.horarios_semana) = 7, 'ISOLAMENTO FALHOU: semana padrão não foi criada';
  assert (select ocupado_ate from public.sessoes where inicio = '2030-01-07 12:00:00+00') = '2030-01-07 13:15:00+00',
    'ISOLAMENTO FALHOU: ocupado_ate deveria ser início + 75 min';
  -- 13:00 cai no intervalo da sessão das 12:00: tem de ser recusado.
  begin
    insert into public.sessoes (cliente_id, inicio, duracao_min, intervalo_min)
      values ('aaaaaaaa-0000-0000-0000-000000000001', '2030-01-07 13:00:00+00', 60, 15);
    raise exception 'ISOLAMENTO FALHOU: aceitou duas sessões no mesmo horário';
  exception when exclusion_violation then null;
  end;
  -- 13:15 em diante pode.
  insert into public.sessoes (cliente_id, inicio, duracao_min, intervalo_min)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2030-01-07 13:15:00+00', 60, 15);
  -- Uma sessão cancelada libera o horário.
  update public.sessoes set situacao = 'cancelada' where inicio = '2030-01-07 13:15:00+00';
  insert into public.sessoes (cliente_id, inicio, duracao_min, intervalo_min)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2030-01-07 13:30:00+00', 30, 0);
end $$;

do $$ begin
  assert (select saldo from public.pacotes_saldo where id = 'aaaaaaaa-0000-0000-0000-000000000002') = 9,
    'ISOLAMENTO FALHOU: saldo da Ana deveria ser 9';
end $$;

-- Eventos não podem ser alterados nem apagados (sem permissão de UPDATE/DELETE) --
do $$
declare n int;
begin
  begin
    update public.eventos set descricao = 'adulterado';
    get diagnostics n = row_count;
    assert n = 0, 'ISOLAMENTO FALHOU: evento foi alterado';
  exception when insufficient_privilege then null; -- esperado
  end;
  begin
    delete from public.eventos;
    get diagnostics n = row_count;
    assert n = 0, 'ISOLAMENTO FALHOU: evento foi apagado';
  exception when insufficient_privilege then null; -- esperado
  end;
end $$;

-- Pacote com vários serviços e saldo por item ----------------------------------
do $$
declare v_id uuid := 'aaaaaaaa-0000-0000-0000-000000000010'; v_massagem uuid := 'aaaaaaaa-0000-0000-0000-000000000011';
  v_manual uuid := 'aaaaaaaa-0000-0000-0000-000000000012';
begin
  insert into public.pacotes (id, cliente_id, total_sessoes, valor_centavos, validade_ate, regra_cancelamento)
    values (v_id, 'aaaaaaaa-0000-0000-0000-000000000001', 8, 80000, current_date + 90, 'regra');
  insert into public.pacote_itens (id, pacote_id, servico_id, nome, duracao_min, quantidade, ordem) values
    (v_massagem, v_id, 'aaaaaaaa-0000-0000-0000-000000000003', 'Massagem relaxante', 60, 5, 0),
    (v_manual, v_id, null, 'Drenagem', 50, 3, 1);
  assert (select versao from public.pacotes where id = v_id) = 1, 'ISOLAMENTO FALHOU: pacote novo deveria ser versão 1';

  insert into public.sessoes (cliente_id, pacote_id, pacote_item_id, inicio, situacao, duracao_min)
    values ('aaaaaaaa-0000-0000-0000-000000000001', v_id, v_manual, '2030-02-01 12:00:00+00', 'feita', 50),
           ('aaaaaaaa-0000-0000-0000-000000000001', v_id, v_manual, '2030-02-02 12:00:00+00', 'feita', 50),
           ('aaaaaaaa-0000-0000-0000-000000000001', v_id, null, '2030-02-03 12:00:00+00', 'feita', 60);
  assert (select saldo from public.pacote_itens_saldo where id = v_manual) = 1, 'ISOLAMENTO FALHOU: saldo do item deveria ser 1';
  assert (select saldo from public.pacote_itens_saldo where id = v_massagem) = 4, 'ISOLAMENTO FALHOU: sessão sem item deveria contar no primeiro item';
  assert (select saldo from public.pacotes_saldo where id = v_id) = 5, 'ISOLAMENTO FALHOU: saldo do pacote deveria ser 5';

  -- Item de um pacote não pode ser usado em sessão de outro pacote.
  begin
    insert into public.sessoes (cliente_id, pacote_id, pacote_item_id, inicio)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', v_manual, '2030-03-01 12:00:00+00');
    raise exception 'ISOLAMENTO FALHOU: sessão usou item de outro pacote';
  exception when raise_exception then
    if sqlerrm not like 'item de outro pacote%' then raise; end if;
  end;
end $$;

-- Anamnese: só com consentimento; versões não mudam; acesso só cresce -----------
do $$ begin
  begin
    insert into public.anamneses (cliente_id, versao, conteudo_cifrado) values ('aaaaaaaa-0000-0000-0000-000000000001', 1, 'v1:xx');
    raise exception 'ISOLAMENTO FALHOU: gravou anamnese sem consentimento';
  exception when raise_exception then
    if sqlerrm not like 'sem consentimento%' then raise; end if;
  end;
  insert into public.anamnese_consentimentos (cliente_id, texto_enviado, hash_sha256) values ('aaaaaaaa-0000-0000-0000-000000000001', 'texto', 'hash');
  insert into public.anamneses (cliente_id, versao, conteudo_cifrado) values ('aaaaaaaa-0000-0000-0000-000000000001', 1, 'v1:xx');
  begin
    insert into public.anamneses (cliente_id, versao, conteudo_cifrado) values ('aaaaaaaa-0000-0000-0000-000000000001', 2, 'texto aberto');
    raise exception 'ISOLAMENTO FALHOU: aceitou anamnese sem cifra';
  exception when check_violation then null;
  end;
  begin
    update public.anamneses set conteudo_cifrado = 'v1:yy';
    raise exception 'ISOLAMENTO FALHOU: versão de anamnese foi alterada';
  exception when insufficient_privilege then null;
  end;
  insert into public.anamnese_acessos (cliente_id, acao) values ('aaaaaaaa-0000-0000-0000-000000000001', 'abriu');
  begin
    delete from public.anamnese_acessos;
    raise exception 'ISOLAMENTO FALHOU: registro de acesso foi apagado';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Profissional B não vê nem mexe em nada da A ---------------------------------
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

do $$
declare n int;
begin
  assert (select count(*) from public.clientes) = 0, 'ISOLAMENTO FALHOU: B vê clientes da A';
  assert (select count(*) from public.pacotes) = 0, 'ISOLAMENTO FALHOU: B vê pacotes da A';
  assert (select count(*) from public.pacotes_saldo) = 0, 'ISOLAMENTO FALHOU: B vê saldo da A';
  assert (select count(*) from public.sessoes) = 0, 'ISOLAMENTO FALHOU: B vê sessões da A';
  assert (select count(*) from public.eventos) = 0, 'ISOLAMENTO FALHOU: B vê eventos da A';
  assert (select count(*) from public.profissionais) = 1, 'ISOLAMENTO FALHOU: B vê outros perfis';
  assert (select count(*) from public.servicos) = 0, 'ISOLAMENTO FALHOU: B vê serviços da A';
  assert (select count(*) from public.pacote_itens) = 0, 'ISOLAMENTO FALHOU: B vê itens de pacote da A';
  assert (select count(*) from public.anamneses) = 0, 'ISOLAMENTO FALHOU: B vê anamnese da A';
  assert (select count(*) from public.anamnese_consentimentos) = 0, 'ISOLAMENTO FALHOU: B vê consentimento da A';
  assert (select count(*) from public.anamnese_acessos) = 0, 'ISOLAMENTO FALHOU: B vê acessos da A';
  assert (select count(*) from public.pacote_itens_saldo) = 0, 'ISOLAMENTO FALHOU: B vê saldo de itens da A';
  assert (select count(*) from public.horarios_semana) = 7, 'ISOLAMENTO FALHOU: B vê horários da A (ou não tem os seus)';

  update public.clientes set nome = 'invadido';
  get diagnostics n = row_count;
  assert n = 0, 'ISOLAMENTO FALHOU: B alterou cliente da A';

  delete from public.pacotes;
  get diagnostics n = row_count;
  assert n = 0, 'ISOLAMENTO FALHOU: B apagou pacote da A';
end $$;

-- B não consegue gravar dado em nome da A nem usar o cliente da A --------------
do $$ begin
  begin
    insert into public.clientes (profissional_id, nome, telefone)
      values ('11111111-1111-1111-1111-111111111111', 'falso', '5511999990002');
    raise exception 'ISOLAMENTO FALHOU: B gravou cliente em nome da A';
  exception when insufficient_privilege then null; -- esperado (RLS)
  end;

  insert into public.clientes (id, nome, telefone) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Cliente da Bia', '5511999990003');
  begin
    insert into public.sessoes (cliente_id, servico_id, inicio)
      values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', now());
    raise exception 'ISOLAMENTO FALHOU: B usou serviço da A';
  exception when raise_exception then
    if sqlerrm not like 'serviço de outro profissional%' then raise; end if;
  end;
  -- B não grava anamnese nem consentimento para cliente da A.
  begin
    insert into public.anamnese_consentimentos (cliente_id, texto_enviado, hash_sha256) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'x');
    raise exception 'ISOLAMENTO FALHOU: B registrou consentimento para cliente da A';
  exception when raise_exception then
    if sqlerrm not like 'cliente de outro profissional%' then raise; end if;
  end;
  begin
    insert into public.anamneses (cliente_id, versao, conteudo_cifrado) values ('aaaaaaaa-0000-0000-0000-000000000001', 9, 'v1:x');
    raise exception 'ISOLAMENTO FALHOU: B gravou anamnese para cliente da A';
  exception when raise_exception then
    if sqlerrm not like 'cliente de outro profissional%' then raise; end if;
  end;
  -- B não põe item no pacote da A.
  begin
    insert into public.pacote_itens (pacote_id, nome, duracao_min, quantidade)
      values ('aaaaaaaa-0000-0000-0000-000000000010', 'x', 60, 1);
    raise exception 'ISOLAMENTO FALHOU: B pôs item no pacote da A';
  exception when raise_exception then
    if sqlerrm not like 'pacote de outro profissional%' then raise; end if;
  end;
  -- A trava de conflito é por profissional: B pode atender no mesmo horário que A.
  insert into public.sessoes (cliente_id, inicio, duracao_min, intervalo_min)
    values ('bbbbbbbb-0000-0000-0000-000000000001', '2030-01-07 12:00:00+00', 60, 15);

  begin
    insert into public.pacotes (cliente_id, total_sessoes, valor_centavos, validade_ate, regra_cancelamento)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 5, 100, current_date, 'x');
    raise exception 'ISOLAMENTO FALHOU: B criou pacote para cliente da A';
  exception when raise_exception then
    if sqlerrm like 'ISOLAMENTO FALHOU%' then raise; end if;
  when foreign_key_violation then null;
  end;
end $$;

select 'OK: isolamento entre profissionais confirmado' as resultado;

rollback;
