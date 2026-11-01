import Link from 'next/link';
import { CircleHelp, Settings } from 'lucide-react';

export function Cabecalho() {
  const icone = 'inline-flex size-11 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100';
  return (
    <header className="mb-3 flex items-center justify-between">
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center" aria-label="maca & mensagem, início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo-sem-slogan.svg" alt="" width={148} height={43} className="h-[2.4rem] w-auto" />
      </Link>
      <nav className="-mr-2 flex">
        <Link href="/wiki" className={icone} aria-label="Ajuda"><CircleHelp className="size-[1.35rem]" aria-hidden /></Link>
        <Link href="/ajustes" className={icone} aria-label="Ajustes"><Settings className="size-[1.35rem]" aria-hidden /></Link>
      </nav>
    </header>
  );
}
