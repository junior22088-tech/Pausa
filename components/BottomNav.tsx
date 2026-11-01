'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const itens = [
  { href: '/', rotulo: 'Hoje', icone: '☀' },
  { href: '/agenda', rotulo: 'Agenda', icone: '▦' },
  { href: '/clientes', rotulo: 'Clientes', icone: '☺' },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl">
        {itens.map((i) => {
          const ativo = i.href === '/' ? path === '/' : path.startsWith(i.href);
          return (
            <li key={i.href} className="flex-1">
              <Link href={i.href} className={`flex min-h-16 flex-col items-center justify-center text-base font-semibold ${ativo ? 'text-emerald-800' : 'text-stone-500'}`}>
                <span aria-hidden className="text-2xl leading-none">{i.icone}</span>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
