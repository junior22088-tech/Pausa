# Visão geral e escopo

**Pausa** é um app web mobile-first para massoterapeutas e terapeutas integrativos autônomos. Ele cuida de agenda, pacotes com saldo, aceite do combinado e anotação de pagamentos. O cliente final só recebe mensagens no WhatsApp por link `wa.me`, enviadas pelo profissional com um toque.

## Princípios

1. **Custo marginal ~zero**: sem API paga de WhatsApp, sem IA, sem push, sem loja de apps.
2. **Nada se apaga**: correções viram eventos numa linha do tempo append-only.
3. **Saldo calculado, nunca guardado**: a view `pacotes_saldo` é a única fonte.
4. **Isolamento por profissional no banco** (RLS), com teste automático.
5. **Dado de saúde só na anamnese**: com consentimento próprio, cifrado e com senha para abrir ([Segurança e LGPD](/wiki/tecnico/seguranca-e-lgpd)).

## Escopo desta versão (Must final da síntese)

| Entra | Sai (por ora) |
|---|---|
| Login por link de uso único (+ código de 6 dígitos) | Campo livre de anotações |
| Clientes por digitação | Importação de contatos |
| Agenda dia/semana, marcar/remarcar/cancelar | PWA obrigatório e push |
| Pacote com saldo calculado e validade | Exportação/exclusão automáticas (manuais via suporte) |
| Resumo + aceite marcado pelo profissional (texto, hash, resposta literal, data) | API WhatsApp, n8n, IA |
| Saldo e lembrete por `wa.me` | Página A/B |
| Pago/não pago (pacote e avulsa) | Pagamento integrado |
| Correção pela linha do tempo | "– especialidade" obrigatório no cabeçalho (ficou opcional) |
| Teste automático de isolamento | |

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind 4 · Supabase (Postgres + Auth) · Vercel.
