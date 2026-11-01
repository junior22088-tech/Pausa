# Operação e suporte

Pensado para ser operado por uma pessoa só, com poucos minutos por semana.

## Rotina

| Quando | O quê |
|---|---|
| Antes de cada deploy | `npm run test:db` e `npm run build` |
| Semanal | Supabase → Advisors (segurança e performance); Vercel → erros de runtime |
| Ao receber pedido LGPD | roteiros abaixo |

## Exportar dados de uma profissional

No SQL Editor (substitua o e-mail):

```sql
with p as (select id from auth.users where email = 'fulana@exemplo.com')
select jsonb_build_object(
  'perfil',     (select to_jsonb(x) from profissionais x where id = (select id from p)),
  'clientes',   (select jsonb_agg(x) from clientes x where profissional_id = (select id from p)),
  'pacotes',    (select jsonb_agg(x) from pacotes_saldo x where profissional_id = (select id from p)),
  'sessoes',    (select jsonb_agg(x) from sessoes x where profissional_id = (select id from p)),
  'pagamentos', (select jsonb_agg(x) from pagamentos x where profissional_id = (select id from p)),
  'aceites',    (select jsonb_agg(x) from aceites x where profissional_id = (select id from p)),
  'eventos',    (select jsonb_agg(x) from eventos x where profissional_id = (select id from p))
);
```

## Excluir uma conta

Supabase → **Authentication → Users** → apagar o usuário. O `on delete cascade` remove o profissional e todos os dados ligados a ele. A ação é irreversível: exporte antes, se pedido.

## Problemas comuns

- **"Não chegou o e-mail"**: limite do SMTP padrão; veja os logs de Auth.
- **Link abre e volta ao login**: Redirect URL não cadastrada ou link já usado; oriente a usar o código.
