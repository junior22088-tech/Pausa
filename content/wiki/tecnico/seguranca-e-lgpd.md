# Segurança e LGPD

## Dados tratados

| Titular | Dados | Base legal (a validar com jurídico) |
|---|---|---|
| Profissional | e-mail, nome, telefone, endereço | execução de contrato |
| Cliente final | nome, WhatsApp, agenda, pacotes, pagamentos | o profissional é o **controlador**; o Pausa é **operador** |

| Cliente final | **anamnese (saúde, dado sensível)** | consentimento específico e destacado (LGPD art. 11, I), registrado com texto + hash |

## Anamnese (dado sensível)

- Consentimento próprio (`anamnese_consentimentos`), pedido por WhatsApp com finalidade, quem vê, guarda e revogação; o trigger `exigir_consentimento` impede gravar sem ele.
- Conteúdo cifrado no servidor com **AES-256-GCM** (`lib/cripto.ts`); chave `PAUSA_ANAMNESE_CHAVE` (32 bytes, base64) só na Vercel. AAD = profissional + cliente: conteúdo copiado para outra ficha não abre. O banco aceita só `conteudo_cifrado like 'v1:%'`.
- Versões imutáveis (`anamneses`: sem grant de update); revogação apaga todas as versões e marca `revogado_em`.
- Abrir exige redigitar a senha; cookie `pausa_anamnese` httpOnly, `SameSite=Strict`, assinado com HMAC (chave derivada por HKDF), 5 min.
- `anamnese_acessos` só cresce (sem update/delete); `eventos` nunca recebe conteúdo de saúde.
- `/clientes/*/anamnese` com `Cache-Control: no-store` e `Referrer-Policy: no-referrer` (proxy).
- Modelo de formulário versionado (`lib/anamnese-modelo.ts`: `modelo`, `modelo_versao`), pronto para modelos personalizados.
- Perder a chave = perder as fichas. Trocar de chave exige reencriptar (`chave_id` já existe para rotação futura).
- Incidente com dado sensível: o controlador (a profissional) comunica ANPD e titulares em 3 dias úteis (Resolução CD/ANPD 15/2024; em dobro para agente de pequeno porte).
- Testes: `npm run test:anamnese` (cripto, selo de desbloqueio, leitura do formulário) e `test:db` (consentimento, cifra obrigatória, versões imutáveis, isolamento).

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
