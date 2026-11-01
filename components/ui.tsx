import Link from 'next/link';
import { LimparAviso } from './LimparAviso';

export const btn = 'inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-lg font-semibold active:scale-[.98]';
export const btnPrimario = `${btn} bg-emerald-700 text-white`;
export const btnSecundario = `${btn} border-2 border-emerald-700 text-emerald-800 bg-white`;
export const btnPerigo = `${btn} border-2 border-red-700 text-red-800 bg-white`;
export const campo = 'block w-full min-h-12 rounded-xl border-2 border-stone-300 bg-white px-3 text-lg focus:border-emerald-700 focus:outline-none';
export const rotulo = 'block text-base font-semibold text-stone-700 mb-1';

export function Titulo({ children, voltar }: { children: React.ReactNode; voltar?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {voltar && <Link href={voltar} className="text-emerald-800 text-lg font-semibold">‹ Voltar</Link>}
      <h1 className="text-2xl font-bold text-stone-900">{children}</h1>
    </div>
  );
}

export function Aviso({ erro, ok }: { erro?: string; ok?: React.ReactNode }) {
  if (!erro && !ok) return null;
  return (
    <div role={erro ? 'alert' : 'status'} className={`mb-4 rounded-xl p-3 text-lg ${erro ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}>
      {erro ?? ok}
      <LimparAviso />
    </div>
  );
}

export function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

/** Ação sem volta: o primeiro toque só abre a confirmação. Sem JavaScript e sem janela do navegador. */
export function Confirmar({ rotulo, pergunta, children, className = btnPerigo }: { rotulo: string; pergunta: string; children: React.ReactNode; className?: string }) {
  return (
    <details className="group">
      <summary className={`${className} w-full cursor-pointer list-none group-open:mb-2`}>{rotulo}</summary>
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
        <p className="mb-3 text-lg font-semibold text-red-900">{pergunta}</p>
        {children}
      </div>
    </details>
  );
}
