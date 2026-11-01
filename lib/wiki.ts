import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

export type Item = { slug: string; titulo: string };
export type Secao = { titulo: string; itens: Item[] };

const RAIZ = path.join(process.cwd(), 'content', 'wiki');

export function navegacao(): Secao[] {
  return JSON.parse(readFileSync(path.join(RAIZ, '_nav.json'), 'utf8'));
}

export function todasAsPaginas(): Item[] {
  return navegacao().flatMap((s) => s.itens);
}

export function pagina(slug: string) {
  const item = todasAsPaginas().find((i) => i.slug === slug);
  if (!item) return null;
  const md = readFileSync(path.join(RAIZ, `${slug}.md`), 'utf8');
  return { ...item, html: marked.parse(md, { async: false }) as string };
}
