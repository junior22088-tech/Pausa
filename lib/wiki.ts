// Central de ajuda: lê content/wiki (Markdown + _nav.json).
//
// Além do Markdown comum, os artigos aceitam blocos visuais:
//   :::passo Título do passo | arquivo.webp
//   Texto do passo (Markdown).
//   :::
//   :::dica / :::atencao  → caixas de destaque
// As imagens ficam em public/ajuda/ (geradas por scripts/capturas-ajuda.cjs).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

export type Item = { slug: string; titulo: string; descricao?: string };
export type Secao = {
  id: string; titulo: string; descricao: string; icone: string;
  trilha?: boolean; tecnico?: boolean; itens: Item[];
};

const RAIZ = path.join(process.cwd(), 'content', 'wiki');

export function navegacao(): Secao[] {
  return JSON.parse(readFileSync(path.join(RAIZ, '_nav.json'), 'utf8'));
}

export function todasAsPaginas(): Item[] {
  return navegacao().flatMap((s) => s.itens);
}

export function secao(id: string) {
  return navegacao().find((s) => s.id === id) ?? null;
}

const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Transforma os blocos :::passo, :::dica e :::atencao em HTML. */
function blocos(md: string) {
  return md.replace(/^:::(passo|dica|atencao)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, tipo: string, cabeca: string, corpo: string) => {
    const interno = marked.parse(corpo.trim(), { async: false }) as string;
    if (tipo === 'passo') {
      const [titulo, imagem] = cabeca.split('|').map((x) => x.trim());
      const img = imagem
        ? `<figure class="passo-img"><img src="/ajuda/${escapar(imagem)}" alt="${escapar(titulo)}" loading="lazy" /></figure>`
        : '';
      return `<section class="passo"><div class="passo-texto"><h3>${escapar(titulo)}</h3>${interno}</div>${img}</section>\n`;
    }
    const rotulo = tipo === 'dica' ? 'Dica' : 'Atenção';
    return `<aside class="caixa caixa-${tipo}"><p class="caixa-rotulo">${rotulo}</p>${interno}</aside>\n`;
  });
}

function lerMd(slug: string) {
  return readFileSync(path.join(RAIZ, `${slug}.md`), 'utf8');
}

export function pagina(slug: string) {
  const item = todasAsPaginas().find((i) => i.slug === slug);
  if (!item) return null;
  // O título vem do menu; o "# Título" do arquivo sai para não repetir.
  const md = lerMd(slug).replace(/^# .*\n+/, '');
  const sec = navegacao().find((s) => s.itens.some((i) => i.slug === slug))!;
  const n = sec.itens.findIndex((i) => i.slug === slug);
  return {
    ...item,
    html: marked.parse(blocos(md), { async: false }) as string,
    secao: sec,
    posicao: n + 1,
    anterior: sec.itens[n - 1] ?? null,
    proxima: sec.itens[n + 1] ?? null,
  };
}

/** Busca simples por palavras no título, descrição e texto dos artigos. */
export function buscar(termo: string) {
  const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const palavras = norm(termo).split(/\s+/).filter((p) => p.length > 1);
  if (!palavras.length) return [];
  return navegacao().flatMap((s) => s.itens.map((i) => {
    const titulo = norm(`${i.titulo} ${i.descricao ?? ''}`);
    const texto = norm(lerMd(i.slug));
    if (!palavras.every((p) => titulo.includes(p) || texto.includes(p))) return null;
    const pontos = palavras.reduce((a, p) => a + (titulo.includes(p) ? 5 : 0) + (texto.split(p).length - 1), 0) + (s.tecnico ? -3 : 0);
    return { ...i, secao: s.titulo, pontos };
  })).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.pontos - a.pontos).slice(0, 12);
}
