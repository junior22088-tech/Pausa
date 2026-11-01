// Gera as imagens da Central de ajuda (public/ajuda/*.webp) a partir da galeria de telas.
// Uso (datas em pt-BR: rode com LANG=pt_BR.UTF-8): PAUSA_GALERIA=1 npx next start -p 3170  (em outro terminal) e depois
//      node scripts/capturas-ajuda.cjs http://localhost:3170
// O destaque laranja mostra onde tocar.
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('node:path');

const BASE = process.argv[2] || 'http://localhost:3170';
const SAIDA = path.join(__dirname, '..', 'public', 'ajuda');

const CAPTURAS = [
  // [arquivo, caminho, seletor a destacar, ações antes]
  ['hoje-abas.webp', '/dev/telas?tela=hoje', 'nav[aria-label="Principal"]'],
  ['hoje-topo.webp', '/dev/telas?tela=hoje', 'a[aria-label="Ajustes"]'],
  ['login.webp', '/login', 'button:has-text("Criar conta")'],
  ['login-entrar.webp', '/login', 'button:has-text("Entrar")'],
  ['login-codigo.webp', '/login?modo=link', 'button:has-text("Receber link")'],
  ['ajustes-mensagens.webp', '/dev/telas?tela=ajustes', 'input[name="nome_mensagem"]', { rolar: 'input[name="nome_mensagem"]' }],
  ['ajustes-agenda.webp', '/dev/telas?tela=ajustes', 'a[href="/ajustes/servicos"]'],
  ['servicos-lista.webp', '/dev/telas?tela=servicos', 'a:has-text("Novo serviço")'],
  ['servicos-novo.webp', '/dev/telas?tela=servicos&aba=novo', 'select[name="duracao"]'],
  ['horarios.webp', '/dev/telas?tela=horarios', 'li:nth-child(1) .group\\/dia'],
  ['folgas.webp', '/dev/telas?tela=folgas', 'a:has-text("Avisar"), button:has-text("Avisar")'],
  ['folgas-nova.webp', '/dev/telas?tela=folgas&vazio=1', 'button:has-text("Registrar folga")', { rolar: 'button:has-text("Registrar folga")' }],
  ['clientes-lista.webp', '/dev/telas?tela=clientes', 'a[href="/clientes/novo"]'],
  ['cliente-novo.webp', '/dev/telas?tela=novo-cliente', 'input[name="telefone"]'],
  ['cliente-ficha.webp', '/dev/telas?tela=ficha', 'nav[aria-label="Ações rápidas"]'],
  ['pacote-servicos.webp', '/dev/telas?tela=pacote', 'fieldset >> nth=0', { pacote: true }],
  ['pacote-valor.webp', '/dev/telas?tela=pacote', 'input[name="valor"]', { pacote: true, rolar: 'input[name="valor"]' }],
  ['pacote-resumo.webp', '/dev/telas?tela=resumo', 'a:has-text("Enviar no WhatsApp"), button:has-text("Enviar no WhatsApp")'],
  ['pacote-aceite.webp', '/dev/telas?tela=resumo', 'button:has-text("Aceitou")', { rolar: 'button:has-text("Aceitou")' }],
  ['pacote-editar.webp', '/dev/telas?tela=pacote-editar', 'fieldset >> nth=0'],
  ['ficha-pacote.webp', '/dev/telas?tela=ficha', 'section:has(h2:has-text("Pacote"))', { rolar: 'section:has(h2:has-text("Pacote"))' }],
  ['agenda-dia.webp', '/dev/telas?tela=agenda', 'a:has-text("Marcar")'],
  ['marcar-horarios.webp', '/dev/telas?tela=marcar', 'text=14:15'],
  ['marcar-fora.webp', '/dev/telas?tela=marcar&vazio=fora', 'text=Fora do expediente'],
  ['sessao.webp', '/dev/telas?tela=sessao', 'button:has-text("Marcar como feita")'],
  ['sessao-folga.webp', '/dev/telas?tela=sessao&aba=folga', 'text=Esta sessão cai numa folga'],
  ['sessao-saldo.webp', '/dev/telas?tela=saldo', 'a:has-text("Enviar saldo"), button:has-text("Enviar saldo")'],
];

(async () => {
  const b = await chromium.launch({ args: ['--lang=pt-BR'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  for (const [arquivo, url, alvo, opc = {}] of CAPTURAS) {
    await p.goto(BASE + url);
    await p.waitForTimeout(350);
    if (opc.pacote) {
      for (let i = 0; i < 6; i++) await p.click('button[aria-label="Mais Massagem relaxante"]');
      for (let i = 0; i < 4; i++) await p.click('button[aria-label="Mais Drenagem linfática"]');
    }
    // Esconde o aviso de confirmação (toast) e rola até o alvo.
    if (opc.rolar) await p.locator(opc.rolar).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const el = p.locator(alvo).first();
    if (await el.count()) {
      await el.evaluate((n) => {
        n.style.outline = '3px solid #f97316';
        // Elemento colado na borda da tela (barra de abas): destaque por dentro.
        const r = n.getBoundingClientRect();
        n.style.outlineOffset = r.bottom >= innerHeight - 2 || r.top <= 2 ? '-4px' : '4px';
        n.style.boxShadow = '0 0 0 10px rgba(249,115,22,.18)';
        if (getComputedStyle(n).position === 'static') n.style.position = 'relative';
        n.style.zIndex = '30';
      });
    } else console.warn('sem alvo:', arquivo, alvo);
    await p.waitForTimeout(150);
    const png = await p.screenshot();
    await sharp(png).resize({ width: 560 }).webp({ quality: 78 }).toFile(path.join(SAIDA, arquivo));
    console.log('ok', arquivo);
  }
  await b.close();
})();
