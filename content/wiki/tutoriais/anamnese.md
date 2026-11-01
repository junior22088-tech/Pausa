# Anamnese

A anamnese é a ficha de saúde da cliente: gestação, pressão, circulação, alergias, lesões e remédios. Serve para você avaliar se a massagem é segura e adaptar o atendimento. Você preenche durante a sessão, com a cliente presente.

Dado de saúde é **dado sensível** pela LGPD. Por isso o maca & mensagem só deixa anotar com a **autorização específica** da cliente, guarda tudo **criptografado** e pede sua senha para abrir.

:::passo Abra a anamnese na ficha da cliente | cliente-anamnese.webp
Na ficha da cliente, toque em **Anamnese**. A linha mostra só o estado ("Protegida · atualizada em…"), nunca o conteúdo.
:::

:::passo Peça a autorização pelo WhatsApp | anamnese-pedido.webp
Toque em **Pedir autorização no WhatsApp**. A mensagem explica para que serve, quem vê (só você), que fica protegida e que ela pode pedir para apagar quando quiser. Ela responde **AUTORIZO**.

Depois, toque em **Ela autorizou** (cole a resposta, se quiser). O maca & mensagem guarda o texto exato enviado, a data e a "impressão digital" do texto, como no aceite do pacote.
:::

:::passo Digite sua senha para abrir | anamnese-bloqueada.webp
A ficha fica trancada. Digite sua senha para abrir: ela fecha sozinha em **5 minutos**. Se você só entra pelo código do e-mail, crie uma senha em **Ajustes → Senha**.
:::

:::passo Preencha com a cliente | anamnese-preencher.webp
Responda **Sim** ou **Não** em cada pergunta; quando é "Sim", aparece um campo curto para o detalhe (ex.: "Ombro direito"). Depois vêm objetivo, pressão da massagem, regiões para evitar e uma **observação curta**.

Toque em **Salvar anamnese**.
:::

:::atencao
Anote só o necessário para atender com segurança. Não escreva diagnósticos, exames nem nada que não precise.
:::

:::passo Confira antes de cada sessão | anamnese-ficha.webp
Ao abrir, o topo mostra **Atenção antes de atender** com os pontos marcados como "Sim". Na tela da sessão aparece o atalho **Conferir anamnese antes de atender**.

Para mudar algo, toque em **Atualizar**: cada atualização vira uma nova **versão**, com data.
:::

:::passo Se a cliente pedir para apagar | anamnese-apagar.webp
Embaixo ficam as versões e o **registro de acesso** (quando a ficha foi aberta ou salva, sem o conteúdo). Se a cliente retirar a autorização, toque em **Cliente pediu para apagar…** e confirme: todas as versões são apagadas e a retirada fica registrada.

Se ela pedir uma cópia, abra a ficha e mostre ou envie as respostas.
:::

## O que protege a ficha

- **Autorização própria**, separada do pacote, com o texto guardado.
- **Criptografia**: no banco de dados fica só texto embaralhado. A chave fica na Vercel, fora do banco.
- **Senha de novo** para abrir, por 5 minutos.
- **Nada de saúde fora da ficha**: não aparece no WhatsApp, no histórico, na agenda nem na busca.
- **Registro de acesso** que não pode ser apagado pelo app.
- O navegador **não guarda cópia** da página.

:::dica
Primeira vez? Antes, a anamnese precisa ser ativada em **Ajustes → Anamnese** (uma chave de proteção, uma vez só).
:::

> O maca & mensagem não substitui orientação jurídica. Vale um profissional de LGPD revisar o texto da autorização e por quanto tempo guardar as fichas.
