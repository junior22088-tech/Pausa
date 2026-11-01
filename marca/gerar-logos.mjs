import { pop, cou, mon } from './fontes.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
mkdirSync('saida', { recursive: true });

export const COR = { salvia: '#84967E', oliva: '#3D4433', branco: '#FFFFFF' };
const d = (f, t, x, y, s) => f.getPath(t, x, y, s).toPathData(2);

// Mão acenando (palma + 4 dedos + polegar) e a onda que leva ao "m".
function mao(cor) {
  const dedo = (x1, y1, x2, y2, w = 16) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  return [
    dedo(41, 112, 27, 63, 16),
    dedo(58, 104, 51, 34, 17),
    dedo(76, 103, 78, 29, 17),
    dedo(92, 108, 103, 47, 16),
    // polegar
    `<path d="M97 140 C106 132 116 126 131 122" stroke="${cor}" stroke-width="16" stroke-linecap="round" fill="none"/>`,
    // palma
    `<path d="M25 106 C23 96 31 91 40 94 L95 98 C105 99 110 108 108 119 L105 142 C101 161 85 171 64 170 C41 169 26 157 25 135 Z" fill="${cor}"/>`,
    // onda (afinada nas pontas) que leva ao "m"
    `<path d="M10 148 C22 172 44 183 70 181 C92 179 108 171 126 172 C112 183 94 191 70 193 C42 195 18 181 10 148 Z" fill="${cor}"/>`,
  ].join('');
}

function horizontal({ maca, mensagem, tag = maca, fundo = null, tagline = true }) {
  const W = tagline ? 800 : 820, H = 240;
  const partes = [
    fundo ? `<rect width="${W}" height="${H}" fill="${fundo}"/>` : '',
    `<g transform="translate(10 8)">`,
    mao(mensagem),
    `<path d="${d(pop, 'maca &', 128, 98, 100)}" fill="${maca}"/>`,
    tagline ? `<path d="${d(mon, 'sua agenda', 551, 63, 27.8)}" fill="${tag}"/><path d="${d(mon, 'descomplicada', 551, 92, 27.8)}" fill="${tag}"/>` : '',
    `<path d="${d(cou, 'mensagem', 121, 187, 133)}" fill="${mensagem}"/>`,
    `</g>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="maca &amp; mensagem${tagline ? ' – sua agenda descomplicada' : ''}">${partes.join('')}</svg>`;
}

function simbolo(cor, fundo = null, raio = 0) {
  const S = 240;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="maca &amp; mensagem">${fundo ? `<rect width="${S}" height="${S}" rx="${raio}" fill="${fundo}"/>` : ''}<g transform="translate(16 26) scale(0.86)">${mao(cor)}<path d="${d(cou, 'm', 112, 192, 150)}" fill="${cor}"/></g></svg>`;
}

export const ARQ = {
  'logo-horizontal.svg': horizontal({ maca: COR.oliva, mensagem: COR.salvia }),
  'logo-horizontal-branco.svg': horizontal({ maca: COR.branco, mensagem: '#C9D6C3', tag: '#E4EBE0' }),
  'logo-horizontal-mono.svg': horizontal({ maca: COR.oliva, mensagem: COR.oliva }),
  'logo-sem-slogan.svg': horizontal({ maca: COR.oliva, mensagem: COR.salvia, tagline: false }),
  'simbolo.svg': simbolo(COR.salvia),
  'simbolo-branco.svg': simbolo(COR.branco),
  'icone-app.svg': simbolo(COR.salvia, '#FFFFFF', 54),
  'icone-app-escuro.svg': simbolo('#E4EBE0', COR.oliva, 54),
};
for (const [n, s] of Object.entries(ARQ)) writeFileSync(`saida/${n}`, s);

// Prévia
const prev = async (n, w, bg = '#F2F2EE') => sharp(Buffer.from(ARQ[n])).resize({ width: w }).flatten({ background: bg }).png().toBuffer();
const tiles = [
  ['logo-horizontal.svg', 900, '#FFFFFF'], ['logo-horizontal-branco.svg', 900, '#3D4433'],
  ['icone-app.svg', 260, '#E9E9E4'], ['icone-app-escuro.svg', 260, '#E9E9E4'], ['simbolo.svg', 260, '#FFFFFF'],
];
const imgs = await Promise.all(tiles.map(([n, w, bg]) => prev(n, w, bg)));
const metas = await Promise.all(imgs.map((b) => sharp(b).metadata()));
let y = 0; const comp = []; let x = 0, rowH = 0;
for (let i = 0; i < imgs.length; i++) {
  if (i === 2) { y += Math.max(metas[0].height, 0) + 20; }
  if (i === 1) { comp.push({ input: imgs[i], left: 0, top: metas[0].height + 10 }); continue; }
  if (i < 2) { comp.push({ input: imgs[i], left: 0, top: 0 }); continue; }
}
const base = metas[0].height * 2 + 30;
comp.push(...imgs.slice(2).map((b, j) => ({ input: b, left: j * 280, top: base })));
await sharp({ create: { width: 920, height: base + 280, channels: 3, background: '#DDDDD8' } }).composite(comp).png().toFile('/tmp/marca-previa.png');
