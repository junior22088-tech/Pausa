import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export const metadata = { title: 'Central de ajuda · Pausa' };

export default function AjudaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/wiki" className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-800">Pausa</span>
            <span className="text-[0.9rem] font-semibold text-stone-500">Central de ajuda</span>
          </Link>
          <Link href="/" className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[0.9rem] font-semibold text-emerald-800 hover:bg-emerald-50">
            Abrir o app<ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-4xl px-4 py-10 text-center text-[0.85rem] text-stone-500">
        Pausa · feito para quem atende com hora marcada
      </footer>
    </div>
  );
}
