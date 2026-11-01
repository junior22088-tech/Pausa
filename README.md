# Pausa

App web mobile-first para massoterapeutas e terapeutas integrativos: agenda, pacotes com saldo calculado, aceite do combinado e anotação de pagamentos. O cliente final só recebe mensagens no WhatsApp por `wa.me`, enviadas pelo profissional com um toque. Não usa API paga nem IA.

Documentação completa em **`/wiki`** (tutoriais de uso e técnica), servida pelo próprio app.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

Variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://mefpbqlymcfjenyzrylk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPORTE_WHATSAPP=55119...
```

## Testes

```bash
npm run test:db   # migração + isolamento entre profissionais (PGlite, sem rede)
npm run build
```

## Banco

- Migração: `supabase/migrations/20261101000000_schema_inicial.sql` (já aplicada no projeto Supabase `pausa`, sa-east-1).
- Teste de isolamento para o SQL Editor: `supabase/tests/isolamento.sql`.

## Deploy

Veja `/wiki/tecnico/deploy`. Resumo: importe o repositório na Vercel, cadastre as variáveis, publique e depois cadastre o domínio nas Redirect URLs do Supabase.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Supabase (Postgres, Auth, RLS) · Vercel
