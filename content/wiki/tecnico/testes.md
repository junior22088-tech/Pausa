# Testes

## Teste de isolamento (obrigatório antes de cada deploy)

`supabase/tests/isolamento.sql` cria duas profissionais (A e B) dentro de uma transação, que termina em `rollback`, e verifica:

- o saldo da A é calculado corretamente (10 − 1 feita = 9);
- eventos não podem ser alterados nem apagados;
- B não vê clientes, pacotes, saldo, sessões nem eventos da A;
- B não altera nem apaga nada da A;
- B não grava cliente em nome da A (RLS);
- B não cria pacote para cliente da A (trigger).

### Local (sem Supabase)

```bash
npm run test:db
# migração aplicada: 20261101000000_schema_inicial.sql
# OK: isolamento entre profissionais confirmado
```

Usa PGlite (Postgres em WASM) com um schema `auth` simulado. Um teste de mutação (desligar o RLS de `clientes`) fez o teste falhar com "B vê clientes da A", o que confirma que ele detecta regressões.

### No Supabase

Cole o conteúdo de `supabase/tests/isolamento.sql` no **SQL Editor** e rode. O resultado esperado é a linha `OK: isolamento entre profissionais confirmado`. Nada fica gravado.

> Status em 01/11/2026: **passou no PGlite**; **ainda não rodado no projeto de produção**. A execução remota pede confirmação manual porque o script contém `update`/`delete`.

## Build

```bash
npm run build   # precisa das variáveis NEXT_PUBLIC_SUPABASE_*
```
