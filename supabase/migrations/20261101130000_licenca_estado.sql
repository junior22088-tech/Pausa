-- Última resposta do servidor de licenças, guardada na própria instalação.
-- Serve para não consultar o servidor a cada página e para tolerar 7 dias sem resposta.
-- Uma linha só (id = 1). Acesso apenas pelas duas funções abaixo.

create table public.licenca_estado (
  id int primary key default 1 check (id = 1),
  status text not null,
  expira_em timestamptz,
  dominio text,
  verificado_em timestamptz not null default now(),   -- última resposta do servidor
  ultima_ativa_em timestamptz                         -- última vez que o servidor disse "ativa"
);
alter table public.licenca_estado enable row level security;
revoke all on public.licenca_estado from anon, authenticated;

create or replace function public.licenca_ler()
returns public.licenca_estado language sql stable security definer set search_path = '' as $$
  select * from public.licenca_estado where id = 1
$$;

create or replace function public.licenca_gravar(p_status text, p_expira_em timestamptz, p_dominio text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('ativa', 'vencida', 'revogada', 'invalida', 'limite_dominios') then
    raise exception 'status de licença desconhecido';
  end if;
  insert into public.licenca_estado as e (id, status, expira_em, dominio, verificado_em, ultima_ativa_em)
  values (1, p_status, p_expira_em, p_dominio, now(), case when p_status = 'ativa' then now() end)
  on conflict (id) do update set
    status = excluded.status,
    expira_em = excluded.expira_em,
    dominio = excluded.dominio,
    verificado_em = now(),
    ultima_ativa_em = case when excluded.status = 'ativa' then now() else e.ultima_ativa_em end;
end $$;

revoke all on function public.licenca_ler() from public, anon;
revoke all on function public.licenca_gravar(text, timestamptz, text) from public, anon;
grant execute on function public.licenca_ler() to authenticated;
grant execute on function public.licenca_gravar(text, timestamptz, text) to authenticated;
