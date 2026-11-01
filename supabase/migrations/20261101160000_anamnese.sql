-- Anamnese: dado de saúde (sensível pela LGPD).
-- - Só com consentimento específico da cliente (anamnese_consentimentos), registrado como o aceite do pacote.
-- - Conteúdo CIFRADO no app (AES-256-GCM, chave PAUSA_ANAMNESE_CHAVE só no servidor): no banco fica texto ilegível.
-- - Cada edição é uma nova versão (linha nova). Apagar a pedido da cliente remove todas as versões.
-- - Registro de acesso sem conteúdo (anamnese_acessos), só cresce.
-- - Modelo de formulário identificado por modelo/modelo_versao, para anamneses personalizadas no futuro.

create table public.anamnese_consentimentos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  texto_enviado text not null,
  hash_sha256 text not null,
  resposta_literal text check (length(resposta_literal) <= 200),
  marcado_em timestamptz not null default now(),
  revogado_em timestamptz
);
create index on public.anamnese_consentimentos (profissional_id, cliente_id, marcado_em desc);

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  versao int not null check (versao >= 1),
  modelo text not null default 'padrao' check (length(modelo) between 1 and 60),
  modelo_versao int not null default 1,
  conteudo_cifrado text not null check (conteudo_cifrado like 'v1:%'),
  chave_id text not null default 'k1',
  criado_em timestamptz not null default now(),
  unique (cliente_id, versao)
);
create index on public.anamneses (profissional_id, cliente_id, versao desc);

create table public.anamnese_acessos (
  id bigint generated always as identity primary key,
  profissional_id uuid not null default auth.uid() references public.profissionais (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  acao text not null check (acao in ('pediu_autorizacao', 'autorizou', 'abriu', 'salvou', 'revogou_e_apagou')),
  em timestamptz not null default now()
);
create index on public.anamnese_acessos (profissional_id, cliente_id, em desc);

-- Cliente tem de ser do mesmo profissional (como nas outras tabelas).
create or replace function public.checar_dono_cliente_anamnese()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.clientes c where c.id = new.cliente_id and c.profissional_id = new.profissional_id)
    then raise exception 'cliente de outro profissional'; end if;
  return new;
end $$;
create trigger checar_dono before insert or update on public.anamnese_consentimentos
  for each row execute function public.checar_dono_cliente_anamnese();
create trigger checar_dono before insert or update on public.anamneses
  for each row execute function public.checar_dono_cliente_anamnese();
create trigger checar_dono before insert or update on public.anamnese_acessos
  for each row execute function public.checar_dono_cliente_anamnese();

-- Só grava anamnese com consentimento ativo.
create or replace function public.exigir_consentimento_anamnese()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.anamnese_consentimentos k
    where k.cliente_id = new.cliente_id and k.profissional_id = new.profissional_id and k.revogado_em is null
  ) then raise exception 'sem consentimento da cliente para anamnese'; end if;
  return new;
end $$;
create trigger exigir_consentimento before insert on public.anamneses
  for each row execute function public.exigir_consentimento_anamnese();

alter table public.anamnese_consentimentos enable row level security;
alter table public.anamneses enable row level security;
alter table public.anamnese_acessos enable row level security;

create policy "dono" on public.anamnese_consentimentos
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono" on public.anamneses
  for all to authenticated using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dono ler" on public.anamnese_acessos
  for select to authenticated using (profissional_id = auth.uid());
create policy "dono anotar" on public.anamnese_acessos
  for insert to authenticated with check (profissional_id = auth.uid());

revoke all on public.anamnese_consentimentos, public.anamneses, public.anamnese_acessos from anon, authenticated;
-- Versões não são alteradas: só se lê, cria nova ou apaga (a pedido da cliente).
grant select, insert, delete on public.anamneses to authenticated;
grant select, insert, update on public.anamnese_consentimentos to authenticated;
-- Registro de acesso só cresce.
grant select, insert on public.anamnese_acessos to authenticated;
