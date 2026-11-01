# Arquitetura

```
Celular do profissional (navegador / PWA)
        │  HTML server-rendered + Server Actions (POST)
        ▼
Vercel ─ Next.js 16 (região gru1 sugerida)
  • proxy.ts: renova sessão Supabase e protege rotas
  • app/(app)/*: telas, todas Server Components
  • lib/actions.ts: toda escrita passa por aqui
        │  @supabase/ssr com o JWT do usuário (cookies)
        ▼
Supabase (sa-east-1)
  • Auth: e-mail OTP (link mágico + código)
  • Postgres: tabelas com RLS por profissional_id = auth.uid()
  • view pacotes_saldo (security_invoker)

Cliente final ◄── wa.me/<telefone>?text=... (aberto pelo profissional)
```

## Decisões estruturais

- **Sem API própria.** O servidor Next fala com o Supabase usando a sessão do usuário. Não existe service-role key no app: se o código tiver um bug, o RLS ainda impede vazamento entre profissionais.
- **Server Components + Server Actions.** Quase nenhum JavaScript no cliente; formulários HTML funcionam até em aparelhos fracos. Os únicos componentes client são `BottomNav` (aba ativa) e `WhatsAppButton` (registra o evento e abre o link).
- **Erros por querystring.** As actions redirecionam com `?erro=` e a página mostra um `Aviso`. É simples e não depende de estado no cliente.
- **Fuso fixo -03:00.** O Brasil não tem horário de verão desde 2019; datas são montadas com `instanteSP()` em `lib/format.ts`.
- **Wiki no mesmo app.** `/wiki` é estática (markdown em `content/wiki`, renderizada com `marked` em build). O Wiki.js precisa de servidor Node persistente e banco, o que não roda na Vercel.
