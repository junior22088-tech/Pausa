'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Sun, Users } from 'lucide-react';

const itens = [
  { href: '/', rotulo: 'Hoje', Icone: Sun },
  { href: '/agenda', rotulo: 'Agenda', Icone: CalendarDays },
  { href: '/clientes', rotulo: 'Clientes', Icone: Users },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {itens.map(({ href, rotulo, Icone }) => {
          const ativo = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={ativo ? 'page' : undefined} className="flex min-h-16 flex-col items-center justify-center gap-1">
                <span className={`inline-flex h-8 w-16 items-center justify-center rounded-full ${ativo ? 'bg-emerald-100 text-emerald-900' : 'text-stone-500'}`}>
                  <Icone className="size-5" strokeWidth={ativo ? 2.4 : 2} aria-hidden />
                </span>
                <span className={`text-[0.75rem] font-semibold ${ativo ? 'text-emerald-900' : 'text-stone-500'}`}>{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
