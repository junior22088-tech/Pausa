-- Pacote com vários serviços (itens), saldo por item e edição com nova versão.
-- Cada item guarda nome, duração e preço do momento (cópia), para que mudar o serviço
-- depois não altere o combinado. Item manual = servico_id nulo.

create table public.pacote_itens (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  pacote_id uuid not null references public.pacotes (id) on delete cascade,
  servico_id uuid references public.servicos (id) on delete set null,
  nome text not null check (length(trim(nome)) between 1 and 80),
  duracao_min int not null check (duracao_min between 10 and 480),
  quantidade int not null check (quantidade between 1 and 100),
  preco_unit_centavos int check (preco_unit_centavos >= 0),
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
create index on public.pacote_itens (pacote_id, ordem);

alter table public.pacotes add column versao int not null default 1 check (versao >= 1);
alter table public.sessoes add column pacote_item_id uuid references public.pacote_itens (id) on delete set null;

-- A view de saldo ganha a versão no fim (sem drop).
create or replace view public.pacotes_saldo with (security_invoker = true) as
select
  p.id, p.profissional_id, p.cliente_id, p.total_sessoes, p.valor_centavos, p.validade_ate,
  p.regra_cancelamento, p.situacao, p.pago, p.criado_em,
  coalesce((
    select count(*) from public.sessoes s
    where s.pacote_id = p.id and s.situacao in ('feita', 'cancelada') and s.desconta
  ), 0)::int as sessoes_usadas,
  greatest(p.total_sessoes - coalesce((
    select count(*) from public.sessoes s
    where s.pacote_id = p.id and s.situacao in ('feita', 'cancelada') and s.desconta
  ), 0), 0)::int as saldo,
  p.servico_id,
  p.versao
from public.pacotes p;

-- Item e serviço têm de ser do mesmo profissional do pacote.
create or replace function public.checar_dono_item()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.pacotes p where p.id = new.pacote_id and p.profissional_id = new.profissional_id)
    then raise exception 'pacote de outro profissional'; end if;
  if new.servico_id is not null and not exists (
    select 1 from public.servicos s where s.id = new.servico_id and s.profissional_id = new.profissional_id
  ) then raise exception 'serviço de outro profissional'; end if;
  return new;
end $$;
create trigger checar_dono_item before insert or update on public.pacote_itens
  for each row execute function public.checar_dono_item();

-- O item da sessão tem de ser do pacote da sessão.
create or replace function public.checar_item_da_sessao()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.pacote_item_id is not null and not exists (
    select 1 from public.pacote_itens i
    where i.id = new.pacote_item_id and i.pacote_id = new.pacote_id and i.profissional_id = new.profissional_id
  ) then raise exception 'item de outro pacote'; end if;
  return new;
end $$;
create trigger checar_item_da_sessao before insert or update on public.sessoes
  for each row execute function public.checar_item_da_sessao();

alter table public.pacote_itens enable row level security;
create policy "dono" on public.pacote_itens
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
revoke all on public.pacote_itens from anon, authenticated;
grant select, insert, update, delete on public.pacote_itens to authenticated;

-- Pacotes que já existem viram um item só (o serviço do pacote, ou "Sessão" de 60 min).
insert into public.pacote_itens (profissional_id, pacote_id, servico_id, nome, duracao_min, quantidade, preco_unit_centavos, ordem, criado_em)
select p.profissional_id, p.id, s.id, coalesce(s.nome, 'Sessão'), coalesce(s.duracao_min, 60), p.total_sessoes, s.preco_centavos, 0, p.criado_em
from public.pacotes p left join public.servicos s on s.id = p.servico_id;

-- Saldo por item. Sessão de pacote sem item (anterior a esta mudança) conta no primeiro item.
create view public.pacote_itens_saldo with (security_invoker = true) as
select
  i.*,
  u.usadas,
  greatest(i.quantidade - u.usadas, 0)::int as saldo
from public.pacote_itens i
cross join lateral (
  select count(*)::int as usadas from public.sessoes s
  where s.situacao in ('feita', 'cancelada') and s.desconta
    and (s.pacote_item_id = i.id
      or (s.pacote_item_id is null and s.pacote_id = i.pacote_id and i.id = (
        select j.id from public.pacote_itens j where j.pacote_id = i.pacote_id order by j.ordem, j.criado_em limit 1)))
) u;
revoke all on public.pacote_itens_saldo from anon, authenticated;
grant select on public.pacote_itens_saldo to authenticated;

-- Criar ou editar um pacote de uma vez (tudo ou nada). Roda com as permissões de quem chama (RLS vale).
-- p_itens: [{"id"?, "servico_id"?, "nome", "duracao_min", "quantidade", "preco_unit_centavos"?}]
-- Para item com servico_id, nome/duração/preço vêm do serviço cadastrado (não do navegador).
-- Editar sobe a versão e volta o pacote para "aguardando aceite": o resumo precisa ser reenviado.
create or replace function public.salvar_pacote(
  p_id uuid, p_cliente_id uuid, p_itens jsonb, p_valor_centavos int, p_validade date, p_regra text
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := p_id;
  v_pacote public.pacotes;
  v_item jsonb;
  v_ordem int := 0;
  v_total int := 0;
  v_servico public.servicos;
  v_nome text; v_dur int; v_qtd int; v_preco int; v_item_id uuid;
  v_mantidos uuid[] := '{}';
  v_usadas int;
  v_primeiro uuid;
  v_pago_soma int;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua pelo menos um serviço no pacote.';
  end if;
  if jsonb_array_length(p_itens) > 10 then raise exception 'No máximo 10 serviços por pacote.'; end if;
  if p_valor_centavos is null or p_valor_centavos < 0 then raise exception 'Confira o valor do pacote.'; end if;
  if p_regra is null or length(trim(p_regra)) = 0 then raise exception 'Escreva a regra de cancelamento.'; end if;

  select coalesce(sum((e->>'quantidade')::int), 0) into v_total from jsonb_array_elements(p_itens) e;
  if v_total < 1 or v_total > 100 then raise exception 'O pacote precisa ter de 1 a 100 sessões no total.'; end if;

  if v_id is null then
    insert into public.pacotes (cliente_id, total_sessoes, valor_centavos, validade_ate, regra_cancelamento)
    values (p_cliente_id, v_total, p_valor_centavos, p_validade, trim(p_regra))
    returning * into v_pacote;
    v_id := v_pacote.id;
  else
    select * into v_pacote from public.pacotes where id = v_id for update;
    if not found then raise exception 'Pacote não encontrado.'; end if;
    if v_pacote.situacao not in ('aguardando_aceite', 'aceito') then
      raise exception 'Pacote encerrado ou desistido não pode ser editado.';
    end if;
    -- Sessões antigas sem item passam a apontar para o primeiro item (o mesmo da regra da view).
    select j.id into v_primeiro from public.pacote_itens j where j.pacote_id = v_id order by j.ordem, j.criado_em limit 1;
    if v_primeiro is not null then
      update public.sessoes set pacote_item_id = v_primeiro where pacote_id = v_id and pacote_item_id is null;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::int;
    if v_qtd is null or v_qtd < 1 or v_qtd > 100 then raise exception 'Quantidade de sessões entre 1 e 100.'; end if;
    if nullif(v_item->>'servico_id', '') is not null then
      select * into v_servico from public.servicos where id = (v_item->>'servico_id')::uuid;
      if not found then raise exception 'Serviço não encontrado.'; end if;
      v_nome := v_servico.nome; v_dur := v_servico.duracao_min; v_preco := v_servico.preco_centavos;
    else
      v_servico := null;
      v_nome := trim(coalesce(v_item->>'nome', ''));
      v_dur := (v_item->>'duracao_min')::int;
      v_preco := nullif(v_item->>'preco_unit_centavos', '')::int;
      if length(v_nome) = 0 then raise exception 'Dê um nome ao item manual.'; end if;
    end if;

    v_item_id := nullif(v_item->>'id', '')::uuid;
    if v_item_id is not null and p_id is not null then
      select usadas into v_usadas from public.pacote_itens_saldo where id = v_item_id and pacote_id = v_id;
      if not found then raise exception 'Item não pertence a este pacote.'; end if;
      if v_qtd < v_usadas then
        raise exception '% já tem % sessões usadas; a quantidade não pode ser menor.', v_nome, v_usadas;
      end if;
      update public.pacote_itens set servico_id = v_servico.id, nome = v_nome, duracao_min = v_dur,
        quantidade = v_qtd, preco_unit_centavos = v_preco, ordem = v_ordem
      where id = v_item_id;
    else
      insert into public.pacote_itens (pacote_id, servico_id, nome, duracao_min, quantidade, preco_unit_centavos, ordem)
      values (v_id, v_servico.id, v_nome, v_dur, v_qtd, v_preco, v_ordem)
      returning id into v_item_id;
    end if;
    v_mantidos := v_mantidos || v_item_id;
    v_ordem := v_ordem + 1;
  end loop;

  if p_id is not null then
    -- Itens tirados do pacote: só se não têm sessão usada nem marcada.
    if exists (
      select 1 from public.sessoes s join public.pacote_itens i on i.id = s.pacote_item_id
      where i.pacote_id = v_id and not (i.id = any (v_mantidos)) and s.situacao <> 'cancelada'
    ) or exists (
      select 1 from public.pacote_itens_saldo i where i.pacote_id = v_id and not (i.id = any (v_mantidos)) and i.usadas > 0
    ) then
      raise exception 'Um serviço retirado já tem sessões marcadas ou usadas. Diminua a quantidade em vez de retirar.';
    end if;
    update public.sessoes set pacote_item_id = null
      where pacote_item_id in (select id from public.pacote_itens where pacote_id = v_id and not (id = any (v_mantidos)));
    delete from public.pacote_itens where pacote_id = v_id and not (id = any (v_mantidos));

    select coalesce(sum(valor_centavos), 0) into v_pago_soma from public.pagamentos where pacote_id = v_id and anulado_em is null;
    update public.pacotes set
      total_sessoes = v_total,
      valor_centavos = p_valor_centavos,
      validade_ate = p_validade,
      regra_cancelamento = trim(p_regra),
      versao = versao + 1,
      situacao = 'aguardando_aceite',
      pago = case when p_valor_centavos = valor_centavos then pago else (v_pago_soma > 0 and v_pago_soma >= p_valor_centavos) end
    where id = v_id;
  end if;

  return v_id;
end $$;
revoke execute on function public.salvar_pacote(uuid, uuid, jsonb, int, date, text) from anon, public;
grant execute on function public.salvar_pacote(uuid, uuid, jsonb, int, date, text) to authenticated;
