import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react';
import { pagina, todasAsPaginas } from '@/lib/wiki';

// Páginas geradas no build a partir de content/wiki/*.md
export const dynamicParams = false;
export function generateStaticParams() {
  return todasAsPaginas().map((p) => ({ slug: p.slug.split('/') }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return { title: `${pagina(slug.join('/'))?.titulo ?? 'Ajuda'} · Central de ajuda · Pausa` };
}

export default async function Artigo({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const p = pagina(slug.join('/'));
  if (!p) notFound();
  const { secao: s } = p;
  const total = s.itens.length;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4">
      {/* Trilha de navegação */}
      <nav aria-label="Você está em" className="flex flex-wrap items-center gap-1 text-[0.85rem] text-stone-500">
        <Link href="/wiki" className="hover:text-emerald-800 hover:underline">Central de ajuda</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/wiki/tema/${s.id}`} className="hover:text-emerald-800 hover:underline">{s.titulo}</Link>
      </nav>

      <header className="mt-3">
        {s.trilha && (
          <div className="mb-3">
            <p className="text-[0.75rem] font-bold uppercase tracking-wider text-emerald-700">Aula {p.posicao} de {total}</p>
            <div className="mt-1.5 flex gap-1" aria-hidden>
              {s.itens.map((i, n) => <span key={i.slug} className={`h-1.5 flex-1 rounded-full ${n < p.posicao ? 'bg-emerald-600' : 'bg-stone-200'}`} />)}
            </div>
          </div>
        )}
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{p.titulo}</h1>
        {p.descricao && <p className="mt-1 text-[1.02rem] text-stone-600">{p.descricao}</p>}
      </header>

      <article className="wiki mt-6 text-base leading-relaxed text-stone-800" dangerouslySetInnerHTML={{ __html: p.html }} />

      {/* Anterior / próxima */}
      <nav aria-label="Continuar" className="mt-8 grid gap-3 sm:grid-cols-2">
        {p.anterior ? (
          <Link href={`/wiki/${p.anterior.slug}`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80 hover:ring-emerald-600">
            <ArrowLeft className="size-5 shrink-0 text-stone-400" aria-hidden />
            <span className="min-w-0"><span className="block text-[0.75rem] font-semibold text-stone-500">{s.trilha ? 'Aula anterior' : 'Anterior'}</span><span className="block font-semibold leading-snug">{p.anterior.titulo}</span></span>
          </Link>
        ) : <span className="hidden sm:block" />}
        {p.proxima ? (
          <Link href={`/wiki/${p.proxima.slug}`} className="flex min-h-16 items-center justify-end gap-3 rounded-2xl bg-emerald-700 p-4 text-right text-white shadow-sm hover:bg-emerald-800">
            <span className="min-w-0"><span className="block text-[0.75rem] font-semibold text-emerald-100">{s.trilha ? 'Próxima aula' : 'Próximo'}</span><span className="block font-semibold leading-snug">{p.proxima.titulo}</span></span>
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
        ) : s.trilha ? (
          <Link href="/" className="flex min-h-16 items-center justify-end gap-3 rounded-2xl bg-emerald-700 p-4 text-right text-white shadow-sm hover:bg-emerald-800">
            <span><span className="block text-[0.75rem] font-semibold text-emerald-100">Trilha concluída</span><span className="block font-semibold">Abrir o Pausa</span></span>
            <Check className="size-5 shrink-0" aria-hidden />
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
