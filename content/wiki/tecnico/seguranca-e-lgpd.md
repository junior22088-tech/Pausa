# Segurança e LGPD

## Dados tratados

| Titular | Dados | Base legal (a validar com jurídico) |
|---|---|---|
| Profissional | e-mail, nome, telefone, endereço | execução de contrato |
| Cliente final | nome, WhatsApp, agenda, pacotes, pagamentos | o profissional é o **controlador**; o Pausa é **operador** |

**Nenhum dado sensível** (saúde) é coletado, por decisão de escopo.

## Controles

- RLS + grants mínimos + triggers de referência ([Banco de dados](/wiki/tecnico/banco-de-dados)).
- Sem service-role key no app.
- Eventos imutáveis pelo app (auditoria).
- Cookies de sessão httpOnly geridos por `@supabase/ssr`.
- Dados no Brasil (Supabase sa-east-1).
- Sair global em Ajustes.

## Direitos do titular

Exportação e exclusão são **manuais nesta versão**: o pedido chega pelo WhatsApp de suporte (`NEXT_PUBLIC_SUPORTE_WHATSAPP`) e é atendido pelo operador via SQL. Roteiro em [Operação](/wiki/tecnico/operacao).

## Pendências antes de abrir ao público

- [ ] Termos de uso e política de privacidade (operador × controlador).
- [ ] SMTP próprio no Supabase.
- [ ] Prazo de resposta a pedidos LGPD definido.
- [ ] Rodar o teste de isolamento no banco de produção (ver [Testes](/wiki/tecnico/testes)).
