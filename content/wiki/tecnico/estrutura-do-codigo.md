# Estrutura do código

```
app/
  layout.tsx              raiz: pt-BR, metadata PWA, themeColor
  manifest.ts             manifest do PWA
  login/page.tsx          e-mail → código
  auth/callback/route.ts  troca ?code= por sessão
  (app)/                  área logada (header + BottomNav)
    page.tsx              Hoje: pendências + sessões do dia
    agenda/               semana e nova sessão
    clientes/             lista, novo, [id], [id]/editar, [id]/pacote
    pacotes/[id]/resumo   envio do resumo e aceite
    sessoes/[id]          detalhe; [id]/feita = tela de saldo
    pagamento/            ?pacote= ou ?sessao=
    ajustes/              perfil, LGPD, sair
  wiki/                   layout, índice, [...slug]
components/
  ui.tsx                  classes e blocos (Titulo, Aviso, Cartao)
  WhatsAppButton.tsx      client: registra evento → abre wa.me
  BottomNav.tsx           client: abas
lib/
  actions.ts              TODAS as escritas ('use server')
  dados.ts                carregarProfissional()
  format.ts               datas, dinheiro, telefone, textos das mensagens
  supabase/server.ts      createClient(), requireUser()
  wiki.ts                 leitura e render da wiki
proxy.ts                  (antigo middleware) sessão + proteção
content/wiki/             esta documentação
supabase/migrations/      schema
supabase/tests/           isolamento.sql
scripts/test-db.mjs       roda migração + teste no PGlite
```

## Convenções

- **Toda escrita gera um evento** (`evento()` em `actions.ts`) com `antes`/`depois` quando é correção.
- **Textos de mensagem só em `lib/format.ts`** (`msgLembrete`, `msgSaldo`, `msgResumoPacote`). Mudou texto? Mude lá.
- **Next 16**: `params`, `searchParams` e `cookies()` são Promises; use `await`. Middleware chama-se `proxy.ts` e exporta `proxy`.
- **Dinheiro em centavos** (`int`) no banco; `reais()` e `paraCentavos()` convertem.
