# Deploy: Supabase e Vercel

## Supabase (feito)

| Item | Valor |
|---|---|
| Projeto | `pausa` · ref `mefpbqlymcfjenyzrylk` |
| Região | sa-east-1 (São Paulo) |
| URL | `https://mefpbqlymcfjenyzrylk.supabase.co` |
| Migração | `schema_inicial` aplicada |
| Advisor de segurança | 0 alertas |

Falta fazer no painel: URLs de redirect e template de e-mail ([Autenticação](/wiki/tecnico/autenticacao)).

## Vercel

### Variáveis de ambiente

| Nome | Valor | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL acima | não: há valor padrão em `lib/supabase/config.ts` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_...` (Supabase → Settings → API Keys) | não: há valor padrão |
| `NEXT_PUBLIC_SITE_URL` | `https://<domínio>` (para o link do e-mail) | recomendada |
| `NEXT_PUBLIC_SUPORTE_WHATSAPP` | ex.: `5511999999999` | recomendada |

A chave publishable é pública por natureza (vai para o navegador). A segurança vem do RLS. **Nunca** coloque a service-role/secret key no app.

### Publicar

**Opção A: GitHub (recomendada)**
1. Suba a pasta do projeto para um repositório.
2. Vercel → **Add New → Project → Import** do repositório.
3. Framework e região (`gru1`) vêm do `vercel.json`.
4. Clique em **Deploy** (variáveis são opcionais).

**Opção B: CLI**
```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel --prod
```

Depois do primeiro deploy, volte ao Supabase e cadastre o domínio em Site URL/Redirect URLs.

> Status em 01/11/2026: a criação do projeto na Vercel pelo conector retornou **403 (sem permissão)**. O deploy precisa ser feito por uma das opções acima.

## Checklist pós-deploy

- [ ] Abrir `/login`, receber e-mail, entrar pelo link **e** pelo código.
- [ ] Criar cliente, pacote, enviar resumo, marcar aceite.
- [ ] Marcar sessão feita e conferir o saldo.
- [ ] Abrir `/wiki` sem estar logado.
- [ ] Rodar o teste de isolamento no SQL Editor.
