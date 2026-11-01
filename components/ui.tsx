import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LimparAviso } from './LimparAviso';

// ---------------------------------------------------------------- Botões
// Três níveis, como nos apps de agenda do mercado:
// principal (cheio, 1 por tela), tonal (ações secundárias) e texto (ações discretas).
export const btn =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition-colors active:scale-[.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';
export const btnPrimario = `${btn} bg-emerald-700 text-white shadow-sm hover:bg-emerald-800`;
export const btnSecundario = `${btn} bg-emerald-50 text-emerald-900 hover:bg-emerald-100`;
export const btnPerigo = `${btn} bg-red-50 text-red-800 hover:bg-red-100`;
export const btnTexto = 'inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-base font-semibold text-emerald-800 hover:bg-emerald-50';
export const btnPequeno = 'min-h-10 px-4 text-[0.9rem]';

// ---------------------------------------------------------------- Campos
export const campo =
  'block w-full min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-base placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20';
export const rotulo = 'mb-1.5 block text-[0.9rem] font-semibold text-stone-700';

// ---------------------------------------------------------------- Estrutura
export function Titulo({
  children, voltar, voltarRotulo = 'Voltar', acao,
}: { children: React.ReactNode; voltar?: string; voltarRotulo?: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-4">
      {(voltar || acao) && (
        <div className="-ml-2 mb-1 flex min-h-11 items-center justify-between">
          {voltar ? (
            <Link href={voltar} className={btnTexto}><ChevronLeft className="size-5" aria-hidden />{voltarRotulo}</Link>
          ) : <span />}
          {acao}
        </div>
      )}
      <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-stone-900">{children}</h1>
    </div>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex min-h-9 items-center justify-between">
        <h2 className="text-[0.8rem] font-bold uppercase tracking-wider text-stone-500">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80 ${className}`}>{children}</div>;
}

export function Aviso({ erro, ok }: { erro?: string; ok?: React.ReactNode }) {
  if (!erro && !ok) return null;
  return (
    <div role={erro ? 'alert' : 'status'} className={`mb-4 rounded-2xl p-3 text-base ${erro ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-950'}`}>
      {erro ?? ok}
      <LimparAviso />
    </div>
  );
}

// ---------------------------------------------------------------- Identidade
const TONS = ['bg-emerald-100 text-emerald-900', 'bg-sky-100 text-sky-900', 'bg-amber-100 text-amber-900', 'bg-rose-100 text-rose-900', 'bg-violet-100 text-violet-900', 'bg-teal-100 text-teal-900'];

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
}

export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${TONS[h % TONS.length]} ${grande ? 'size-16 text-xl' : 'size-11 text-[0.85rem]'}`}>
      {iniciais(nome)}
    </span>
  );
}

// ---------------------------------------------------------------- Status
const CHIP = {
  verde: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  ambar: 'bg-amber-50 text-amber-900 ring-amber-200',
  vermelho: 'bg-red-50 text-red-800 ring-red-200',
  cinza: 'bg-stone-100 text-stone-700 ring-stone-200',
} as const;

export function Chip({ tom = 'cinza', children }: { tom?: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 ring-inset ${CHIP[tom]}`}>{children}</span>;
}

export function Progresso({ usadas, total }: { usadas: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((usadas / total) * 100)) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={usadas} aria-label={`${usadas} de ${total} sessões usadas`}>
      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------- Listas
export function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">{children}</ul>;
}

export function LinhaLista({
  href, inicio, titulo, subtitulo, fim,
}: { href: string; inicio?: React.ReactNode; titulo: React.ReactNode; subtitulo?: React.ReactNode; fim?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50 active:bg-stone-100">
        {inicio}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-stone-900">{titulo}</span>
          {subtitulo && <span className="block truncate text-[0.85rem] text-stone-500">{subtitulo}</span>}
        </span>
        {fim}
        <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
      </Link>
    </li>
  );
}

export function Vazio({ icone, titulo, texto, acao }: { icone: React.ReactNode; titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 px-6 py-8 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-500">{icone}</span>
      <p className="text-base font-semibold text-stone-800">{titulo}</p>
      {texto && <p className="mt-1 text-[0.9rem] text-stone-500">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Ações
/** Ação rápida em círculo com rótulo, como no topo da ficha de contato do celular. */
export function AcaoRapida({ href, icone, rotulo, externo = false }: { href: string; icone: React.ReactNode; rotulo: string; externo?: boolean }) {
  const corpo = (
    <>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">{icone}</span>
      <span className="text-[0.8rem] font-semibold text-stone-700">{rotulo}</span>
    </>
  );
  const cls = 'flex min-w-16 flex-1 flex-col items-center gap-1.5 rounded-2xl py-2 hover:bg-stone-50';
  return externo
    ? <a href={href} className={cls} target="_blank" rel="noopener noreferrer">{corpo}</a>
    : <Link href={href} className={cls}>{corpo}</Link>;
}

/** Botão flutuante da ação principal da tela (acima da barra inferior). */
export function Fab({ href, rotulo, icone }: { href: string; rotulo: string; icone: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-17rem))] z-20 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-700 px-5 text-base font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
    >
      {icone}{rotulo}
    </Link>
  );
}

/** Abas por link (?aba=), funcionam sem JavaScript. */
export function Abas({ itens, ativa }: { itens: { id: string; rotulo: string; href: string; contagem?: number }[]; ativa: string }) {
  return (
    <nav aria-label="Seções" className="flex gap-1 rounded-full bg-stone-100 p-1">
      {itens.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          scroll={false}
          aria-current={i.id === ativa ? 'page' : undefined}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full text-[0.85rem] font-semibold ${i.id === ativa ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}
        >
          {i.rotulo}
          {i.contagem ? <span className="text-stone-400">{i.contagem}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Confirmação para ações sem volta: o primeiro toque só abre a pergunta. */
export function Confirmar({ rotulo, pergunta, children, className = btnPerigo }: { rotulo: string; pergunta: string; children: React.ReactNode; className?: string }) {
  return (
    <details className="group">
      <summary className={`${className} w-full cursor-pointer list-none group-open:mb-2`}>{rotulo}</summary>
      <div className="rounded-2xl bg-red-50 p-3">
        <p className="mb-3 text-base font-semibold text-red-900">{pergunta}</p>
        {children}
      </div>
    </details>
  );
}
