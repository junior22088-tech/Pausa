import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { estadoLicenca } from '@/lib/licenca';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const licenca = await estadoLicenca();
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      {licenca.aviso && (
        <Link
          href="/instalacao"
          role={licenca.podeGravar ? 'status' : 'alert'}
          className={`mb-3 block rounded-xl p-3 text-base font-semibold ${licenca.podeGravar ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-900'}`}
        >
          {licenca.aviso} <span className="underline">Ver licença</span>
        </Link>
      )}
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
