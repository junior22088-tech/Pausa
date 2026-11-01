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

-- Pacote com vários serviços, saldo por item e edição com nova versão ---------
do $$
declare v_id uuid; v_massagem uuid; v_manual uuid; v_versao int; v_situacao text;
begin
  v_id := public.salvar_pacote(null, 'aaaaaaaa-0000-0000-0000-000000000001',
    '[{"servico_id":"aaaaaaaa-0000-0000-0000-000000000003","nome":"ignorado","duracao_min":999,"quantidade":5},
      {"nome":"Drenagem","duracao_min":50,"quantidade":3,"preco_unit_centavos":10000}]'::jsonb,
    80000, current_date + 90, 'regra');
  assert (select total_sessoes from public.pacotes where id = v_id) = 8, 'ISOLAMENTO FALHOU: total do pacote deveria ser 8';
  select id into v_massagem from public.pacote_itens where pacote_id = v_id and ordem = 0;
  select id into v_manual from public.pacote_itens where pacote_id = v_id and ordem = 1;
  assert (select nome || duracao_min from public.pacote_itens where id = v_massagem) = 'Massagem relaxante60',
    'ISOLAMENTO FALHOU: item de serviço deveria copiar nome e duração do cadastro, não do navegador';
  assert (select nome from public.pacote_itens where id = v_manual) = 'Drenagem', 'ISOLAMENTO FALHOU: item manual';

  -- 2 sessões de drenagem feitas: saldo por item.
  insert into public.sessoes (cliente_id, pacote_id, pacote_item_id, inicio, situacao, duracao_min)
    values ('aaaaaaaa-0000-0000-0000-000000000001', v_id, v_manual, '2030-02-01 12:00:00+00', 'feita', 50),
           ('aaaaaaaa-0000-0000-0000-000000000001', v_id, v_manual, '2030-02-02 12:00:00+00', 'feita', 50);
  assert (select saldo from public.pacote_itens_saldo where id = v_manual) = 1, 'ISOLAMENTO FALHOU: saldo do item deveria ser 1';
  assert (select saldo from public.pacote_itens_saldo where id = v_massagem) = 5, 'ISOLAMENTO FALHOU: saldo da massagem deveria ser 5';
  assert (select saldo from public.pacotes_saldo where id = v_id) = 6, 'ISOLAMENTO FALHOU: saldo do pacote deveria ser 6';

  -- Item de um pacote não pode ser usado em sessão de outro pacote.
  begin
    insert into public.sessoes (cliente_id, pacote_id, pacote_item_id, inicio)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', v_manual, '2030-03-01 12:00:00+00');
    raise exception 'ISOLAMENTO FALHOU: sessão usou item de outro pacote';
  exception when raise_exception then
    if sqlerrm not like 'item de outro pacote%' then raise; end if;
  end;

  update public.pacotes set situacao = 'aceito' where id = v_id;

  -- Não pode diminuir abaixo do usado nem retirar item usado.
  begin
    perform public.salvar_pacote(v_id, null, jsonb_build_array(
      jsonb_build_object('id', v_massagem, 'servico_id', 'aaaaaaaa-0000-0000-0000-000000000003', 'quantidade', 5),
      jsonb_build_object('id', v_manual, 'nome', 'Drenagem', 'duracao_min', 50, 'quantidade', 1)), 80000, current_date + 90, 'regra');
    raise exception 'ISOLAMENTO FALHOU: deixou quantidade abaixo do usado';
  exception when raise_exception then
    if sqlerrm like 'ISOLAMENTO FALHOU%' then raise; end if;
  end;
  begin
    perform public.salvar_pacote(v_id, null, jsonb_build_array(
      jsonb_build_object('id', v_massagem, 'servico_id', 'aaaaaaaa-0000-0000-0000-000000000003', 'quantidade', 5)), 80000, current_date + 90, 'regra');
    raise exception 'ISOLAMENTO FALHOU: retirou item com sessões usadas';
  exception when raise_exception then
    if sqlerrm like 'ISOLAMENTO FALHOU%' then raise; end if;
  end;

  -- Edição válida: +1 drenagem, novo item manual, valor e regra novos → versão 2, aguardando aceite.
  perform public.salvar_pacote(v_id, null, jsonb_build_array(
    jsonb_build_object('id', v_massagem, 'servico_id', 'aaaaaaaa-0000-0000-0000-000000000003', 'quantidade', 5),
    jsonb_build_object('id', v_manual, 'nome', 'Drenagem', 'duracao_min', 50, 'quantidade', 4),
    jsonb_build_object('nome', 'Pedras quentes', 'duracao_min', 90, 'quantidade', 1)), 95000, current_date + 120, 'regra nova');
  select versao, situacao into v_versao, v_situacao from public.pacotes where id = v_id;
  assert v_versao = 2 and v_situacao = 'aguardando_aceite', 'ISOLAMENTO FALHOU: edição deveria criar versão 2 aguardando aceite';
  assert (select total_sessoes from public.pacotes where id = v_id) = 10, 'ISOLAMENTO FALHOU: total após edição deveria ser 10';
  assert (select saldo from public.pacote_itens_saldo where id = v_manual) = 2, 'ISOLAMENTO FALHOU: saldo da drenagem após edição deveria ser 2';
  assert (select count(*) from public.pacote_itens where pacote_id = v_id) = 3, 'ISOLAMENTO FALHOU: deveria ter 3 itens';
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
  -- B não edita pacote da A pela função.
  begin
    perform public.salvar_pacote((select null::uuid), 'aaaaaaaa-0000-0000-0000-000000000001',
      '[{"nome":"x","duracao_min":60,"quantidade":1}]'::jsonb, 100, current_date, 'x');
    raise exception 'ISOLAMENTO FALHOU: B criou pacote pela função para cliente da A';
  exception when raise_exception then
    if sqlerrm like 'ISOLAMENTO FALHOU%' then raise; end if;
  when foreign_key_violation then null;
  end;
  begin
    perform public.salvar_pacote('aaaaaaaa-0000-0000-0000-000000000002', null,
      '[{"nome":"x","duracao_min":60,"quantidade":1}]'::jsonb, 100, current_date, 'x');
    raise exception 'ISOLAMENTO FALHOU: B editou pacote da A';
  exception when raise_exception then
    if sqlerrm not like 'Pacote não encontrado%' then raise; end if;
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
