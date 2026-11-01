-- Servidor de licenças do Pausa (roda SÓ no Supabase do vendedor, nunca na instalação do comprador).
-- O comprador recebe uma chave PAUSA-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX. Guardamos só o hash.
-- A instalação chama public.verificar_licenca(chave, dominio) pela API pública do Supabase.
-- Nada de dado pessoal da terapeuta ou dos clientes dela passa por aqui: só chave e domínio.

create schema if not exists licencas;
revoke all on schema licencas from public, anon, authenticated;

create table licencas.licencas (
  id uuid primary key default gen_random_uuid(),
  hash_chave text not null unique,
  final_chave text not null,                    -- últimos 8 caracteres, para achar a licença no suporte
  email_comprador text not null,
  observacao text,
  dias_validade int not null default 365 check (dias_validade between 1 and 3650),
  max_dominios int not null default 1 check (max_dominios between 1 and 100),
  expira_em timestamptz,                        -- definido na primeira ativação
  revogada_em timestamptz,
  motivo_revogacao text,
  criada_em timestamptz not null default now()
);

create table licencas.ativacoes (
  licenca_id uuid not null references licencas.licencas (id) on delete cascade,
  dominio text not null,
  primeira_em timestamptz not null default now(),
  ultima_em timestamptz not null default now(),
  verificacoes int not null default 1,
  primary key (licenca_id, dominio)
);

alter table licencas.licencas enable row level security;
alter table licencas.ativacoes enable row level security;

create or replace function licencas.normalizar(chave text)
returns text language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(chave, ''), '\s', '', 'g'))
$$;

create or replace function licencas.hash(chave text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(licencas.normalizar(chave), 'UTF8')), 'hex')
$$;

-- Emite uma chave nova. Rode no SQL Editor: select licencas.emitir('comprador@email.com');
-- A chave aparece UMA vez; copie e envie ao comprador.
create or replace function licencas.emitir(
  email text, dias int default 365, dominios int default 1, obs text default null
) returns text language plpgsql set search_path = '' as $$
declare
  bruto text := upper(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
  chave text := 'PAUSA-' || substr(bruto, 1, 8) || '-' || substr(bruto, 9, 8) || '-' || substr(bruto, 33, 8) || '-' || substr(bruto, 41, 8);
begin
  insert into licencas.licencas (hash_chave, final_chave, email_comprador, dias_validade, max_dominios, observacao)
  values (licencas.hash(chave), right(chave, 8), lower(trim(email)), dias, dominios, obs);
  return chave;
end $$;

-- Revoga (reembolso, chargeback, revenda). A instalação passa a funcionar só para leitura.
create or replace function licencas.revogar(chave_ou_final text, motivo text default 'reembolso')
returns int language plpgsql set search_path = '' as $$
declare n int;
begin
  update licencas.licencas set revogada_em = now(), motivo_revogacao = motivo
  where revogada_em is null
    and (hash_chave = licencas.hash(chave_ou_final) or final_chave = licencas.normalizar(chave_ou_final));
  get diagnostics n = row_count;
  return n;
end $$;

-- Renova por mais N dias a partir do vencimento atual (ou de hoje, se já venceu).
create or replace function licencas.renovar(chave_ou_final text, dias int default 365)
returns timestamptz language plpgsql set search_path = '' as $$
declare nova timestamptz;
begin
  update licencas.licencas
     set expira_em = greatest(coalesce(expira_em, now()), now()) + make_interval(days => dias),
         revogada_em = null, motivo_revogacao = null
   where hash_chave = licencas.hash(chave_ou_final) or final_chave = licencas.normalizar(chave_ou_final)
  returning expira_em into nova;
  return nova;
end $$;

-- Visão para o vendedor acompanhar (SQL Editor): select * from licencas.painel;
create or replace view licencas.painel as
select l.final_chave, l.email_comprador, l.criada_em, l.expira_em, l.revogada_em, l.motivo_revogacao,
       l.max_dominios, coalesce(string_agg(a.dominio, ', '), '') as dominios, max(a.ultima_em) as ultima_verificacao
from licencas.licencas l left join licencas.ativacoes a on a.licenca_id = l.id
group by l.id order by l.criada_em desc;

-- Única porta pública. Devolve só o necessário para a instalação decidir o modo.
create or replace function public.verificar_licenca(chave text, dominio text)
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  l licencas.licencas%rowtype;
  dom text := lower(split_part(regexp_replace(coalesce(dominio, ''), '^https?://', ''), '/', 1));
  dom_sem_porta text;
  local boolean;
  usados int;
begin
  dom_sem_porta := split_part(dom, ':', 1);
  local := dom_sem_porta in ('localhost', '127.0.0.1', '') or dom_sem_porta like '%.localhost';

  select * into l from licencas.licencas where hash_chave = licencas.hash(chave);
  if not found then
    return jsonb_build_object('status', 'invalida');
  end if;
  if l.revogada_em is not null then
    return jsonb_build_object('status', 'revogada', 'desde', l.revogada_em);
  end if;

  if not local then
    if not exists (select 1 from licencas.ativacoes a where a.licenca_id = l.id and a.dominio = dom) then
      select count(*) into usados from licencas.ativacoes a where a.licenca_id = l.id;
      if usados >= l.max_dominios then
        return jsonb_build_object('status', 'limite_dominios', 'max_dominios', l.max_dominios);
      end if;
    end if;
    insert into licencas.ativacoes (licenca_id, dominio) values (l.id, dom)
    on conflict (licenca_id, dominio) do update
      set ultima_em = now(), verificacoes = licencas.ativacoes.verificacoes + 1;
    if l.expira_em is null then
      update licencas.licencas set expira_em = now() + make_interval(days => l.dias_validade)
      where id = l.id returning expira_em into l.expira_em;
    end if;
  end if;

  if l.expira_em is not null and l.expira_em < now() then
    return jsonb_build_object('status', 'vencida', 'expira_em', l.expira_em);
  end if;
  return jsonb_build_object(
    'status', 'ativa',
    'expira_em', l.expira_em,
    'dias_restantes', case when l.expira_em is null then l.dias_validade
                           else greatest(0, ceil(extract(epoch from l.expira_em - now()) / 86400))::int end
  );
end $$;

revoke all on function public.verificar_licenca(text, text) from public;
grant execute on function public.verificar_licenca(text, text) to anon, authenticated;
revoke all on all functions in schema licencas from public, anon, authenticated;
