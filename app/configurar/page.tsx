import { CONFIGURADO } from '@/lib/supabase/config';

export const metadata = { title: 'Configurar · Pausa' };

// Mostrada quando a instalação ainda não tem Supabase configurado.
export default function Configurar() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10 text-lg">
      <h1 className="mb-3 text-3xl font-bold text-emerald-800">Falta configurar o Pausa</h1>
      {CONFIGURADO ? (
        <p>Tudo certo: o Supabase está configurado. <a className="underline" href="/login">Ir para o login</a>.</p>
      ) : (
        <>
          <p className="mb-4">Esta instalação ainda não sabe qual banco usar. Na sua hospedagem (Vercel ou Netlify), cadastre as variáveis e publique de novo:</p>
          <ul className="mb-4 list-disc space-y-1 pl-6 font-mono text-base">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
            <li>PAUSA_LICENCA</li>
          </ul>
          <p>O passo a passo completo está no <a className="font-semibold underline" href="/wiki/instalacao/passo-a-passo">guia de instalação</a>.</p>
        </>
      )}
    </main>
  );
}
