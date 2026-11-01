import sharp from 'sharp'; import { readFileSync, writeFileSync } from 'node:fs';
const app = readFileSync('saida/icone-app.svg');
// Ícone "maskable": fundo inteiro, símbolo dentro da área segura (80%).
const simb = readFileSync('saida/simbolo.svg', 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#FFFFFF"/><g transform="translate(36 36) scale(0.7)">${simb}</g></svg>`;
writeFileSync('saida/icone-maskable.svg', mask);
const P = '/home/claude/pausa';
await sharp(app).resize(192).png().toFile(`${P}/public/icon-192.png`);
await sharp(Buffer.from(mask)).resize(512).png().toFile(`${P}/public/icon-512.png`);
await sharp(app).resize(512).png().toFile(`${P}/public/icon-512-rounded.png`);
await sharp(Buffer.from(mask)).resize(180).flatten({ background: '#FFFFFF' }).png().toFile(`${P}/app/apple-icon.png`);
writeFileSync(`${P}/app/icon.svg`, readFileSync('saida/icone-app.svg'));
