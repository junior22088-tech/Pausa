-- Pacote com vários serviços (itens), saldo por item e edição com nova versão.
-- As regras de criar/editar ficam no app (lib/pacote-regras.ts + lib/actions.ts); aqui, as travas.
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
