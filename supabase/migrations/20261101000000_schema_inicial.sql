-- Pausa · schema inicial do Must
-- Regra de ouro: toda tabela de negócio tem profissional_id e só o próprio
-- profissional lê e escreve (RLS). O teste em supabase/tests/isolamento.sql
-- garante isso e deve rodar antes de cada deploy.

-- gen_random_uuid() é nativo do Postgres 13+; não precisa de extensão.

-- Profissional (1:1 com auth.users) ------------------------------------------
create table public.profissionais (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_mensagem text not null default '',
  especialidade text,               -- opcional: "massoterapia" no cabeçalho
  telefone text,
  endereco text,
  regra_cancelamento text not null default
    'Remarcações e cancelamentos com pelo menos 24 horas de antecedência. Sem aviso, a sessão é descontada do pacote.',
  criado_em timestamptz not null default now()
);

-- Cria o profissional quando o usuário entra pela primeira vez
create or replace function public.criar_profissional()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profissionais (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_profissional();

-- Clientes -------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  telefone text not null check (telefone ~ '^[0-9]{12,13}$'),  -- 55 + DDD + número
  criado_em timestamptz not null default now()
);
create index on public.clientes (profissional_id, nome);

-- Pacotes --------------------------------------------------------------------
create table public.pacotes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  total_sessoes int not null check (total_sessoes between 1 and 100),
  valor_centavos int not null check (valor_centavos >= 0),
  validade_ate date not null,
  regra_cancelamento text not null,
  situacao text not null default 'aguardando_aceite'
    check (situacao in ('aguardando_aceite', 'aceito', 'desistiu', 'encerrado')),
  pago boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.pacotes (profissional_id, cliente_id);

-- Sessões --------------------------------------------------------------------
create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  pacote_id uuid references public.pacotes (id) on delete set null,
  inicio timestamptz not null,
  situacao text not null default 'marcada' check (situacao in ('marcada', 'feita', 'cancelada')),
  desconta boolean not null default true,      -- só vale quando há pacote
  valor_avulso_centavos int check (valor_avulso_centavos >= 0),
  pago boolean not null default false,          -- só para sessão avulsa
  lembrete_aberto_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on public.sessoes (profissional_id, inicio);

-- Pagamentos (nunca apagados: anulados) --------------------------------------
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  pacote_id uuid references public.pacotes (id) on delete set null,
  sessao_id uuid references public.sessoes (id) on delete set null,
  valor_centavos int not null check (valor_centavos > 0),
  forma text not null check (forma in ('pix', 'cartao', 'dinheiro')),
  recebido_em timestamptz not null default now(),
  anulado_em timestamptz
);

-- Aceites: cópia do texto enviado + hash, marcado pelo profissional -----------
create table public.aceites (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  pacote_id uuid not null references public.pacotes (id) on delete cascade,
  texto_enviado text not null,
  hash_sha256 text not null,
  versao int not null default 1,
  resposta_literal text,                        -- o que o cliente respondeu, copiado pelo profissional
  marcado_em timestamptz not null default now(),
  marcado_pelo_profissional boolean not null default true
);

-- Eventos: linha do tempo que só cresce -------------------------------------
create table public.eventos (
  id bigint generated always as identity primary key,
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete cascade,
  entidade text not null,
  entidade_id uuid,
  tipo text not null,          -- criou, corrigiu, anulou, abriu_whatsapp, aceitou, desistiu...
  descricao text not null,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);
create index on public.eventos (profissional_id, cliente_id, criado_em desc);

-- Saldo calculado, nunca guardado. Desconta: sessão feita, ou cancelada fora
-- do prazo quando o profissional escolheu descontar (desconta = true).
create view public.pacotes_saldo with (security_invoker = true) as
select
  p.*,
  coalesce((
    select count(*) from public.sessoes s
    where s.pacote_id = p.id and s.situacao in ('feita', 'cancelada') and s.desconta
  ), 0)::int as sessoes_usadas,
  greatest(p.total_sessoes - coalesce((
    select count(*) from public.sessoes s
    where s.pacote_id = p.id and s.situacao in ('feita', 'cancelada') and s.desconta
  ), 0), 0)::int as saldo
from public.pacotes p;

-- RLS ------------------------------------------------------------------------
alter table public.profissionais enable row level security;
alter table public.clientes      enable row level security;
alter table public.pacotes       enable row level security;
alter table public.sessoes       enable row level security;
alter table public.pagamentos    enable row level security;
alter table public.aceites       enable row level security;
alter table public.eventos       enable row level security;

create policy "proprio perfil" on public.profissionais
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "dono" on public.clientes
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.pacotes
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.sessoes
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.pagamentos
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.aceites
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());

-- Eventos: só ler e inserir; nunca alterar nem apagar pelo app
create policy "dono le" on public.eventos
  for select to authenticated using (profissional_id = auth.uid());
create policy "dono insere" on public.eventos
  for insert to authenticated with check (profissional_id = auth.uid());

-- Um cliente/pacote/sessão de outro profissional não pode ser referenciado
create or replace function public.checar_dono_referencias()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.cliente_id is not null and not exists (
    select 1 from public.clientes c where c.id = new.cliente_id and c.profissional_id = new.profissional_id
  ) then raise exception 'cliente de outro profissional'; end if;
  if tg_table_name in ('sessoes', 'pagamentos') then
    if new.pacote_id is not null and not exists (
      select 1 from public.pacotes p where p.id = new.pacote_id and p.profissional_id = new.profissional_id
    ) then raise exception 'pacote de outro profissional'; end if;
  end if;
  return new;
end $$;

create trigger checar_dono before insert or update on public.pacotes
  for each row execute function public.checar_dono_referencias();
create trigger checar_dono before insert or update on public.sessoes
  for each row execute function public.checar_dono_referencias();
create trigger checar_dono before insert or update on public.pagamentos
  for each row execute function public.checar_dono_referencias();
create trigger checar_dono before insert on public.eventos
  for each row execute function public.checar_dono_referencias();

create or replace function public.checar_dono_aceite()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.pacotes p where p.id = new.pacote_id and p.profissional_id = new.profissional_id
  ) then raise exception 'pacote de outro profissional'; end if;
  return new;
end $$;

create trigger checar_dono before insert or update on public.aceites
  for each row execute function public.checar_dono_aceite();

-- O Supabase concede tudo a anon/authenticated por padrão; aqui deixamos explícito.
revoke all on public.profissionais, public.clientes, public.pacotes, public.sessoes,
  public.pagamentos, public.aceites, public.eventos, public.pacotes_saldo from anon, authenticated;
revoke execute on function public.criar_profissional() from anon, authenticated, public;

grant select, insert, update, delete on public.profissionais, public.clientes, public.pacotes,
  public.sessoes, public.pagamentos, public.aceites to authenticated;
grant select, insert on public.eventos to authenticated;
grant select on public.pacotes_saldo to authenticated;
