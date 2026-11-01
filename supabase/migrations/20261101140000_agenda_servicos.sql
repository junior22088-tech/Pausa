-- Agenda por serviço: serviços com duração, horário de atendimento (com almoço),
-- folgas e bloqueios, intervalo entre sessões e trava contra dois atendimentos no mesmo horário.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- Intervalo entre o fim de uma sessão e o início da próxima (limpar a sala, trocar lençol).
alter table public.profissionais add column intervalo_min int not null default 15 check (intervalo_min between 0 and 120);

-- Serviços ----------------------------------------------------------------
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 80),
  duracao_min int not null check (duracao_min between 10 and 480),
  preco_centavos int check (preco_centavos >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index on public.servicos (profissional_id, ativo, nome);

-- Semana padrão: uma linha por dia da semana (0 = domingo … 6 = sábado), em minutos desde 00:00.
create table public.horarios_semana (
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  atende boolean not null default false,
  inicio_min int not null default 540 check (inicio_min between 0 and 1439),
  fim_min int not null default 1080 check (fim_min between 1 and 1440),
  almoco_inicio_min int check (almoco_inicio_min between 0 and 1439),
  almoco_fim_min int check (almoco_fim_min between 1 and 1440),
  primary key (profissional_id, dia_semana),
  check (fim_min > inicio_min),
  check ((almoco_inicio_min is null) = (almoco_fim_min is null)),
  check (almoco_inicio_min is null or (almoco_fim_min > almoco_inicio_min and almoco_inicio_min >= inicio_min and almoco_fim_min <= fim_min))
);

-- Folgas e bloqueios: um dia, um período (férias) ou só um trecho do dia.
create table public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  dia_inteiro boolean not null default true,
  inicio_min int check (inicio_min between 0 and 1439),
  fim_min int check (fim_min between 1 and 1440),
  motivo text check (length(motivo) <= 120),
  criado_em timestamptz not null default now(),
  check (data_fim >= data_inicio),
  check (dia_inteiro or (inicio_min is not null and fim_min is not null and fim_min > inicio_min))
);
create index on public.bloqueios (profissional_id, data_fim);

-- Pacote ligado a um serviço (opcional para pacotes antigos).
alter table public.pacotes add column servico_id uuid references public.servicos (id) on delete set null;

-- Sessões: serviço, duração e intervalo guardados no momento da marcação,
-- para que mudar o serviço depois não altere o passado. ocupado_ate = início + duração + intervalo.
alter table public.sessoes add column servico_id uuid references public.servicos (id) on delete set null;
alter table public.sessoes add column duracao_min int not null default 60 check (duracao_min between 10 and 480);
alter table public.sessoes add column intervalo_min int not null default 0 check (intervalo_min between 0 and 120);
alter table public.sessoes add column ocupado_ate timestamptz;

create or replace function public.calcular_ocupado_ate()
returns trigger language plpgsql set search_path = public as $$
begin
  new.ocupado_ate := new.inicio + make_interval(mins => new.duracao_min + new.intervalo_min);
  return new;
end $$;

create trigger calcular_ocupado_ate before insert or update of inicio, duracao_min, intervalo_min on public.sessoes
  for each row execute function public.calcular_ocupado_ate();

-- Preenche as sessões que já existem (via USING, sem UPDATE em massa).
alter table public.sessoes alter column ocupado_ate type timestamptz using inicio + make_interval(mins => duracao_min + intervalo_min);
alter table public.sessoes alter column ocupado_ate set not null;

-- A trava: duas sessões ativas do mesmo profissional nunca se sobrepõem (incluindo o intervalo).
alter table public.sessoes add constraint sessoes_sem_conflito
  exclude using gist (profissional_id with =, tstzrange(inicio, ocupado_ate) with &&)
  where (situacao <> 'cancelada');

-- O serviço e o pacote referenciados têm de ser do mesmo profissional.
create or replace function public.checar_dono_servico()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.servico_id is not null and not exists (
    select 1 from public.servicos s where s.id = new.servico_id and s.profissional_id = new.profissional_id
  ) then raise exception 'serviço de outro profissional'; end if;
  return new;
end $$;

create trigger checar_dono_servico before insert or update on public.sessoes
  for each row execute function public.checar_dono_servico();
create trigger checar_dono_servico before insert or update on public.pacotes
  for each row execute function public.checar_dono_servico();

-- RLS e permissões
alter table public.servicos enable row level security;
alter table public.horarios_semana enable row level security;
alter table public.bloqueios enable row level security;

create policy "dono" on public.servicos
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.horarios_semana
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.bloqueios
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());

revoke all on public.servicos, public.horarios_semana, public.bloqueios from anon, authenticated;
grant select, insert, update, delete on public.servicos, public.horarios_semana, public.bloqueios to authenticated;

-- A view de saldo passa a mostrar o serviço do pacote. Sem drop: a coluna nova entra no fim.
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
  p.servico_id
from public.pacotes p;
revoke all on public.pacotes_saldo from anon, authenticated;
grant select on public.pacotes_saldo to authenticated;

-- Semana padrão para quem já tem conta: seg a sex, 9h–18h, almoço 12h–13h.
insert into public.horarios_semana (profissional_id, dia_semana, atende, inicio_min, fim_min, almoco_inicio_min, almoco_fim_min)
select p.id, d, d between 1 and 5, 540, 1080, case when d between 1 and 5 then 720 end, case when d between 1 and 5 then 780 end
from public.profissionais p cross join generate_series(0, 6) d
on conflict do nothing;

-- E para quem entrar depois: o trigger de criação do profissional também cria a semana padrão.
create or replace function public.criar_profissional()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profissionais (id) values (new.id) on conflict do nothing;
  insert into public.horarios_semana (profissional_id, dia_semana, atende, inicio_min, fim_min, almoco_inicio_min, almoco_fim_min)
  select new.id, d, d between 1 and 5, 540, 1080, case when d between 1 and 5 then 720 end, case when d between 1 and 5 then 780 end
  from generate_series(0, 6) d
  on conflict do nothing;
  return new;
end $$;
revoke execute on function public.criar_profissional() from anon, authenticated, public;
