import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
const F = (p) => { const b = readFileSync('node_modules/@fontsource/' + p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
export const pop = F('poppins/files/poppins-latin-800-normal.woff');
export const cou = F('courgette/files/courgette-latin-400-normal.woff');
export const mon = F('montserrat/files/montserrat-latin-500-normal.woff');
