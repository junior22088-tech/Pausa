# WhatsApp por link (wa.me)

## Como funciona

```
https://wa.me/5511987654321?text=<mensagem url-encoded>
```

`linkWhatsApp(telefone, texto)` em `lib/format.ts` monta o link. O `WhatsAppButton` (client):

1. chama uma Server Action que registra o envio (`registrarEnvioResumo` ou `registrarWhatsApp`);
2. só então faz `window.location.href = link`.

O evento é gravado **antes** de abrir, porque a navegação para o WhatsApp pode encerrar a página.

## Mensagens

| Mensagem | Função | Quando |
|---|---|---|
| Resumo do pacote | `msgResumoPacote` | criar pacote; o texto exato vai para o evento `abriu_whatsapp` |
| Saldo | `msgSaldo` | após "Feita"; variante `correcao` |
| Lembrete | `msgLembrete` | botão Lembrar; grava `lembrete_aberto_em` |

Cabeçalho: `nome_mensagem`, ou `nome – especialidade` se a especialidade estiver preenchida.

## Aceite e hash

`marcarAceite` pega o **último texto efetivamente enviado** (evento `abriu_whatsapp` do pacote), calcula SHA-256, grava em `aceites` com `versao = n+1` e muda o pacote para `aceito`. Isso prova qual texto foi aceito, mesmo que a regra mude depois.

## Limites conhecidos

- Não sabemos se a mensagem foi de fato enviada; registramos que foi **aberta**.
- O aceite é declarado pelo profissional. A `resposta_literal` colada é a evidência.
- Sem API não há envio automático nem leitura de respostas, e isso é deliberado.
