# Registro de decisões

| # | Decisão | Por quê | Alternativa descartada |
|---|---|---|---|
| 1 | WhatsApp só por `wa.me`, enviado pelo profissional | custo zero, número que a cliente já conhece | API oficial (paga, número separado); automações tipo n8n |
| 2 | Profissional usa app mobile-first; cliente só WhatsApp | público final mais velho não instala app | portal do cliente |
| 3 | Aceite marcado pelo profissional + hash + resposta literal | prova suficiente sem ler conversas | aceite por link/assinatura |
| 4 | Saldo calculado (view), nunca guardado | correções se propagam sozinhas | contador na tabela |
| 5 | Eventos append-only; pagamentos anulados, não apagados | confiança e auditoria | edição livre |
| 6 | Cancelamento com desconto = `cancelada` + `desconta` | não mente que a sessão aconteceu | marcar como "feita" |
| 7 | Anamnese só com consentimento próprio, cifrada no app e com senha para abrir (antes: sem ficha de saúde) | pedido das profissionais; dado sensível exige proteção reforçada | texto aberto no banco; criptografia só do disco |
| 8 | Login por e-mail OTP + código | sem senha; funciona no PWA do iPhone | senha; só link |
| 9 | Pagamento só anotado | entrevistas: profissionais recebem via Pix e não querem cobrar pelo app | gateway integrado |
| 10 | Wiki em `/wiki` no próprio Next | roda na Vercel sem servidor extra | Wiki.js (exige servidor e banco persistentes) |
| 11 | `cacheComponents: false` no Next 16 | incompatível com rotas estáticas da wiki; app é todo dinâmico | PPR |
| 12 | Fuso fixo -03:00 | Brasil sem horário de verão desde 2019 | biblioteca de fuso |
| 13 | Revogar grants padrão do Supabase | `eventos` ficaria editável via grant; defesa em profundidade | confiar só no RLS |
