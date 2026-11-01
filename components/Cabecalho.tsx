import Link from 'next/link';
import { CircleHelp, Settings } from 'lucide-react';

export function Cabecalho() {
  const icone = 'inline-flex size-11 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100';
  return (
    <header className="mb-3 flex items-center justify-between">
      <Link href="/" className="text-lg font-bold tracking-tight text-emerald-800">Pausa</Link>
      <nav className="-mr-2 flex">
        <Link href="/wiki/tutoriais/primeiros-passos" className={icone} aria-label="Ajuda"><CircleHelp className="size-[1.35rem]" aria-hidden /></Link>
        <Link href="/ajustes" className={icone} aria-label="Ajustes"><Settings className="size-[1.35rem]" aria-hidden /></Link>
      </nav>
    </header>
  );
}
