# Marca maca & mensagem

- Logos oficiais (arquivos do cliente: `logotipo.svg` e `icone.svg`) e as variações geradas a partir deles, em `public/marca/`:
  `logo-horizontal.svg` (com slogan), `logo-sem-slogan.svg`, `logo-horizontal-branco.svg` (fundo escuro),
  `logo-sem-slogan-branco.svg`, `logo-horizontal-mono.svg`, `simbolo.svg`, `simbolo-branco.svg`, `icone-app.svg`, `icone-app-escuro.svg`, `icone-maskable.svg`.
- Fontes de origem: Poppins ExtraBold ("maca &"), Courgette ("mensagem"), Montserrat Medium (slogan).
- Paleta (em `app/globals.css`, sobre a escala `emerald` do Tailwind): sálvia 500 `#859880` (logo), 700 `#55654F` (botões e links, 6,2:1 no branco), oliva 900 `#363D31`.
- Para regerar: numa pasta com `opentype.js` e `@fontsource/{poppins,montserrat,courgette}` instalados, `node gerar-logos.mjs` e `node icones.mjs`.
