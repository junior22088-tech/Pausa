# Autenticação

E-mail sem senha (Supabase Auth OTP), com dois caminhos no mesmo e-mail:

1. **Link mágico**: `signInWithOtp({ email, options: { emailRedirectTo: <site>/auth/callback } })`. O callback faz `exchangeCodeForSession(code)` e redireciona para `/`.
2. **Código de 6 dígitos**: `verifyOtp({ email, token, type: 'email' })`. Necessário no PWA instalado do iPhone, onde o link abre no Safari e não no app.

## Sessão

- `lib/supabase/server.ts` cria um cliente por requisição com `@supabase/ssr` (`getAll`/`setAll` de cookies).
- `proxy.ts` renova o token a cada requisição e redireciona para `/login` quem não tem usuário. Rotas públicas: `/login`, `/auth`, `/wiki`, `/manifest.webmanifest`, ícones.
- **Sair** usa `signOut({ scope: 'global' })`: derruba todos os aparelhos.

## Configuração obrigatória no painel do Supabase

**Authentication → URL Configuration**
- Site URL: `https://<domínio-do-app>`
- Redirect URLs: `https://<domínio-do-app>/auth/callback` (e `http://localhost:3000/auth/callback` para dev)

**Authentication → Email Templates → Magic Link**: incluir o código:

```html
<h2>Seu acesso ao Pausa</h2>
<p><a href="{{ .ConfirmationURL }}">Entrar no Pausa</a></p>
<p>Ou digite este código no app: <strong>{{ .Token }}</strong></p>
```

**SMTP**: o e-mail padrão do Supabase tem limite baixo de envios por hora. Antes de abrir para usuários reais, configure um SMTP próprio (a verificar: provedor e limite).
