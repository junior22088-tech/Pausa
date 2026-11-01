import Link from 'next/link';
import { navegacao } from '@/lib/wiki';

export const metadata = { title: 'Wiki · Pausa' };

function Menu() {
  return (
    <>
      {navegacao().map((s) => (
        <div key={s.titulo} className="mb-4">
          <p className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-500">{s.titulo}</p>
          <ul>
            {s.itens.map((i) => (
              <li key={i.slug}><Link href={`/wiki/${i.slug}`} className="block py-1 text-base text-stone-800 hover:text-emerald-800">{i.titulo}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:flex md:gap-8">
      <aside className="mb-6 md:w-64 md:shrink-0">
        <Link href="/wiki" className="mb-1 block text-xl font-bold text-emerald-800">Wiki do Pausa</Link>
        <Link href="/" className="mb-4 block text-base text-stone-600 underline">Abrir o app</Link>
        <details className="md:hidden">
          <summary className="min-h-12 cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-base font-semibold">Todas as páginas</summary>
          <div className="pt-3"><Menu /></div>
        </details>
        <div className="hidden md:block"><Menu /></div>
      </aside>
      <article className="wiki min-w-0 flex-1 text-base leading-relaxed">{children}</article>
    </div>
  );
}
