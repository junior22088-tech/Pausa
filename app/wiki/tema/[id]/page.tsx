import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navegacao, secao } from '@/lib/wiki';
import { Busca } from '@/components/ajuda/Busca';
import { IconeSecao } from '@/components/ajuda/Icone';

export const dynamicParams = false;
export function generateStaticParams() {
  return navegacao().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${secao(id)?.titulo ?? 'Ajuda'} · Central de ajuda · Pausa` };
}

export default async function Tema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = secao(id);
  if (!s) notFound();
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-4">
      <Link href="/wiki" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[0.9rem] font-semibold text-emerald-800 hover:bg-emerald-50">
        <ChevronLeft className="size-4" aria-hidden />Todos os temas
      </Link>
      <header className="flex items-start gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><IconeSecao nome={s.icone} /></span>
        <div>
          <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight">{s.titulo}</h1>
          <p className="text-[0.95rem] text-stone-600">{s.descricao}</p>
          <p className="mt-1 text-[0.8rem] font-semibold text-stone-400">{s.itens.length} {s.itens.length === 1 ? 'artigo' : 'artigos'}</p>
        </div>
      </header>
      <Busca />
      <ol className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
        {s.itens.map((i, n) => (
          <li key={i.slug}>
            <Link href={`/wiki/${i.slug}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50">
              {s.trilha && <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[0.8rem] font-bold text-stone-700">{n + 1}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold leading-snug">{i.titulo}</span>
                {i.descricao && <span className="block text-[0.85rem] text-stone-500">{i.descricao}</span>}
              </span>
              <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
