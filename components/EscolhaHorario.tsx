import Link from 'next/link';
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import { hhmm, type Livres } from '@/lib/agenda-horarios';

export type DiaFaixa = { iso: string; sigla: string; numero: string; hoje: boolean; passado: boolean; livres: number };

const MOTIVO: Record<string, string> = {
  folga: 'Dia marcado como folga.',
  nao_atende: 'Você não atende neste dia da semana.',
  lotado: 'Sem horário livre no expediente deste dia.',
  passado: 'O expediente de hoje já terminou.',
};

/**
 * Escolha de dia (faixa da semana) e de horário livre (botões de 15 em 15 min).
 * Não há campo para digitar hora: só horários livres podem ser escolhidos.
 */
export function EscolhaHorario({
  semana, dia, livres, horaEscolhida, foraAberto, duracao, intervalo, href, anterior, proxima,
}: {
  semana: DiaFaixa[]; dia: string; livres: Livres; horaEscolhida: string | null; foraAberto: boolean;
  duracao: number; intervalo: number;
  href: (p: { dia?: string; hora?: string | null; fora?: boolean }) => string;
  anterior: string; proxima: string;
}) {
  const botao = (t: number) => {
    const h = hhmm(t);
    const ativo = h === horaEscolhida;
    return (
      <li key={t}>
        <Link
          href={href({ hora: h })}
          scroll={false}
          aria-current={ativo ? 'true' : undefined}
          className={`flex h-12 items-center justify-center rounded-xl text-base font-semibold tabular-nums ring-1 ring-inset ${ativo ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-800 ring-stone-200 hover:ring-emerald-600'}`}
        >
          {h}
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <Link href={href({ dia: anterior, hora: null })} scroll={false} aria-label="Semana anterior" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"><ChevronLeft className="size-5" aria-hidden /></Link>
        <ol className="grid flex-1 grid-cols-7 gap-1">
          {semana.map((d) => {
            const ativo = d.iso === dia;
            const cls = `flex h-16 flex-col items-center justify-center rounded-2xl ${ativo ? 'bg-emerald-700 text-white shadow-sm' : d.passado ? 'text-stone-300' : d.livres === 0 ? 'text-stone-400' : d.hoje ? 'bg-white text-emerald-800 ring-1 ring-emerald-300' : 'text-stone-700 hover:bg-white'}`;
            const corpo = (
              <>
                <span className={`text-[0.7rem] font-semibold uppercase ${ativo ? 'text-emerald-100' : ''}`}>{d.sigla}</span>
                <span className="text-[1.05rem] font-bold leading-tight">{d.numero}</span>
                <span aria-hidden className={`mt-0.5 size-1.5 rounded-full ${d.livres > 0 && !d.passado ? (ativo ? 'bg-white' : 'bg-emerald-600') : 'bg-transparent'}`} />
              </>
            );
            return (
              <li key={d.iso}>
                {d.passado
                  ? <span className={cls} aria-disabled>{corpo}</span>
                  : <Link href={href({ dia: d.iso, hora: null })} scroll={false} aria-current={ativo ? 'date' : undefined} aria-label={`${d.sigla} ${d.numero}: ${d.livres} horários livres`} className={cls}>{corpo}</Link>}
              </li>
            );
          })}
        </ol>
        <Link href={href({ dia: proxima, hora: null })} scroll={false} aria-label="Próxima semana" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"><ChevronRight className="size-5" aria-hidden /></Link>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-bold">Horários livres</h2>
          <span className="text-[0.8rem] text-stone-500">{duracao} min{intervalo ? ` + ${intervalo} de intervalo` : ''}</span>
        </div>
        {livres.normais.length > 0
          ? <ul className="grid grid-cols-4 gap-2">{livres.normais.map(botao)}</ul>
          : <p className="rounded-2xl bg-stone-100 p-4 text-center text-[0.9rem] text-stone-600">{livres.motivo ? MOTIVO[livres.motivo] : 'Sem horário livre.'}{livres.folga?.motivo ? ` (${livres.folga.motivo})` : ''}</p>}
      </div>

      {livres.motivo !== 'folga' && livres.fora.length > 0 && (
        foraAberto ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-bold"><Moon className="size-4" aria-hidden />Fora do expediente</h2>
              <Link href={href({ fora: false })} scroll={false} className="text-[0.85rem] font-semibold text-emerald-800">Esconder</Link>
            </div>
            <ul className="grid grid-cols-4 gap-2">{livres.fora.map(botao)}</ul>
          </div>
        ) : (
          <Link href={href({ fora: true })} scroll={false} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[0.9rem] font-semibold text-emerald-800 hover:bg-emerald-50">
            <Moon className="size-4" aria-hidden />Ver horários fora do expediente
          </Link>
        )
      )}
    </div>
  );
}
