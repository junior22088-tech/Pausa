import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-emerald-800">Pausa</Link>
        <nav className="flex gap-4 text-base font-semibold text-stone-600">
          <Link href="/wiki/tutoriais/primeiros-passos">Ajuda</Link>
          <Link href="/ajustes">Ajustes</Link>
        </nav>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
