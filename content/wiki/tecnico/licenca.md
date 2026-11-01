# Licença e servidor de licenças

Cada instalação tem uma chave (`PAUSA_LICENCA`) conferida no servidor de licenças do autor. Sem licença ativa o app fica **só leitura**; nenhum dado é apagado.

## Peças

| Peça | Onde | O que faz |
| --- | --- | --- |
| Servidor de licenças | Supabase do autor, schema `licencas` (`servidor-licencas/01_licencas.sql`) | Guarda só o **hash** SHA-256 de cada chave, os domínios ativados e a validade |
| Porta pública | `public.verificar_licenca(chave, dominio)`, `security definer`, executável por `anon` | Responde `ativa`, `vencida`, `revogada`, `invalida` ou `limite_dominios` |
| Cache na instalação | `public.licenca_estado` + `licenca_ler()` / `licenca_gravar()` | Última resposta, para não consultar a cada página e tolerar quedas |
| Regras | `lib/licenca-regras.ts` (puras, testadas) | Decidem o estado a partir do cache e da resposta |
| Integração | `lib/licenca.ts` | `estadoLicenca()` por requisição; `exigirLicenca()` no início de toda ação que grava |
| Telas | Faixa no layout, `/instalacao` | Aviso de vencimento, modo só leitura, "Verificar agora" |

## Regras

- **Validade:** `dias_validade` (365 por padrão) contados da **primeira ativação** num domínio real. Localhost não ativa nem conta.
- **Domínios:** `max_dominios` (1 por padrão). Um domínio novo além do limite recebe `limite_dominios`.
- **Revalidação:** a cada 12 h, ou quando o domínio muda, ou em "Verificar agora".
- **Tolerância:** sem resposta do servidor, a última confirmação `ativa` vale por 7 dias. Depois, `sem_resposta` → só leitura.
- **Só leitura:** `exigirLicenca()` redireciona para `/instalacao?bloqueado=1`. Ficam liberados: login, sair, definir senha e o registro de abertura do WhatsApp.
- **Privacidade:** a chamada envia só `chave` e `dominio` (há teste garantindo isso).
- **Instalação do autor:** dispensada de chave quando reconhecida por `VERCEL_GIT_REPO_OWNER` / `VERCEL_PROJECT_PRODUCTION_URL` e usando o Supabase do autor.

## Proteção do banco do autor

Os valores padrão de Supabase em `lib/supabase/config.ts` só valem na instalação do autor. Em qualquer outra, sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, o `proxy.ts` leva para `/configurar`. Testado localmente nos dois cenários.

## Limites conhecidos

- Quem tem o código (ou o build) pode remover a verificação. A licença é uma trava contra uso casual; a proteção principal é o código fechado entregue pelo instalador, os termos de licença e as atualizações.
- `licenca_gravar` pode ser chamada por qualquer usuário logado da própria instalação. Isso não abre acesso a outras instalações.

## Testes

```bash
npm run test:licencas      # servidor: 19 casos (emissão, hash, domínios, vencimento, revogação, renovação, permissões)
npm run test:licenca-app   # regras da instalação: 19 casos (tolerância, cache, domínio, chamada HTTP)
npm test                   # tudo, incluindo o isolamento entre profissionais
```
