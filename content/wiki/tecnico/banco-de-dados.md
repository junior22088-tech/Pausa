# Banco de dados e RLS

Migração: `supabase/migrations/20261101000000_schema_inicial.sql`.

## Tabelas

| Tabela | Papel | Pontos-chave |
|---|---|---|
| `profissionais` | 1:1 com `auth.users` | criada por trigger `ao_criar_usuario`; textos das mensagens |
| `clientes` | nome + telefone | telefone `^[0-9]{12,13}$` (55 + DDD + número) |
| `pacotes` | combinado | `total_sessoes`, `valor_centavos`, `validade_ate`, `regra_cancelamento` (cópia), `situacao`, `pago` |
| `sessoes` | agenda | `situacao` marcada/feita/cancelada; `desconta`; `valor_avulso_centavos`; `pago` (avulsa) |
| `pagamentos` | anotação | nunca apagado: `anulado_em` |
| `aceites` | prova do combinado | `texto_enviado`, `hash_sha256`, `versao`, `resposta_literal` |
| `eventos` | linha do tempo | **append-only**: só `select` e `insert` |

## Saldo

```sql
saldo = greatest(total_sessoes - count(sessoes
          where situacao in ('feita','cancelada') and desconta), 0)
```

A view `pacotes_saldo` usa `security_invoker = true`, ou seja, respeita o RLS de quem consulta.

## Isolamento (três camadas)

1. **RLS** em todas as tabelas: `profissional_id = auth.uid()` em `using` e `with check`.
2. **Grants mínimos**: o Supabase concede tudo a `anon`/`authenticated` por padrão; a migração revoga e concede só o necessário. `anon` não tem acesso a nada.
3. **Triggers de referência** (`checar_dono_referencias`, `checar_dono_aceite`): impedem ligar um pacote, sessão, pagamento ou evento a cliente/pacote de outro profissional, mesmo que o ID seja conhecido.

`profissional_id` tem `default auth.uid()`; o app nunca envia esse campo.

## Estado em produção

- Projeto Supabase `pausa` (`mefpbqlymcfjenyzrylk`, sa-east-1), migração `schema_inicial` aplicada em 01/11/2026.
- Security Advisor: **0 alertas** após a migração.
