import Link from 'next/link';
import { CalendarPlus, Check, ChevronLeft, ChevronRight, MessageCircle, Plus } from 'lucide-react';
import { Chip, Fab, Vazio, btnPrimario } from '@/components/ui';

export type DiaSemana = { iso: string; sigla: string; numero: string; hoje: boolean; qtd: number };
export type SessaoAgenda = { id: string; hora: string; nome: string; situacao: 'marcada' | 'feita'; tipo: 'pacote' | 'avulsa'; lembreteAberto: boolean };

export function TelaAgenda({
  mes, semana, selecionado, tituloDia, sessoes, semanaAnterior, proximaSemana, hojeISO,
}: {
  mes: string; semana: DiaSemana[]; selecionado: string; tituloDia: string; sessoes: SessaoAgenda[];
  semanaAnterior: string; proximaSemana: string; hojeISO: string;
}) {
  const ehHoje = selecionado === hojeISO;
  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[0.85rem] font-semibold text-stone-500 first-letter:uppercase">{mes}</p>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">Agenda</h1>
        </div>
        {!ehHoje && <Link href={`/agenda?dia=${hojeISO}`} className="rounded-full bg-emerald-50 px-4 py-2 text-[0.85rem] font-semibold text-emerald-900">Hoje</Link>}
      </div>

      {/* Faixa da semana */}
      <div className="flex items-center gap-1">
        <Link href={`/agenda?dia=${semanaAnterior}`} scroll={false} aria-label="Semana anterior" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"><ChevronLeft className="size-5" aria-hidden /></Link>
        <ol className="grid flex-1 grid-cols-7 gap-1">
          {semana.map((d) => {
            const ativo = d.iso === selecionado;
            return (
              <li key={d.iso}>
                <Link
                  href={`/agenda?dia=${d.iso}`}
                  scroll={false}
                  aria-current={ativo ? 'date' : undefined}
                  aria-label={`${d.sigla} ${d.numero}${d.qtd ? `, ${d.qtd} ${d.qtd === 1 ? 'sessão' : 'sessões'}` : ', livre'}`}
                  className={`flex h-16 flex-col items-center justify-center rounded-2xl ${ativo ? 'bg-emerald-700 text-white shadow-sm' : d.hoje ? 'bg-white text-emerald-800 ring-1 ring-emerald-300' : 'text-stone-700 hover:bg-white'}`}
                >
                  <span className={`text-[0.7rem] font-semibold uppercase ${ativo ? 'text-emerald-100' : 'text-stone-500'}`}>{d.sigla}</span>
                  <span className="text-[1.05rem] font-bold leading-tight">{d.numero}</span>
                  <span aria-hidden className={`mt-0.5 size-1.5 rounded-full ${d.qtd ? (ativo ? 'bg-white' : 'bg-emerald-600') : 'bg-transparent'}`} />
                </Link>
              </li>
            );
          })}
        </ol>
        <Link href={`/agenda?dia=${proximaSemana}`} scroll={false} aria-label="Próxima semana" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"><ChevronRight className="size-5" aria-hidden /></Link>
      </div>

      {/* Dia escolhido */}
      <div className="flex items-baseline justify-between pt-1">
        <h2 className="text-base font-bold first-letter:uppercase">{ehHoje ? `Hoje, ${tituloDia}` : tituloDia}</h2>
        <span className="text-[0.85rem] text-stone-500">{sessoes.length ? `${sessoes.length} ${sessoes.length === 1 ? 'sessão' : 'sessões'}` : 'livre'}</span>
      </div>

      {sessoes.length === 0 ? (
        <Vazio icone={<CalendarPlus className="size-6" aria-hidden />} titulo="Dia livre"
          acao={<Link href={`/agenda/nova?dia=${selecionado}`} className={btnPrimario}><Plus className="size-5" aria-hidden />Marcar neste dia</Link>} />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
          {sessoes.map((s) => (
            <li key={s.id}>
              <Link href={`/sessoes/${s.id}`} className={`flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-stone-50 active:bg-stone-100 ${s.situacao === 'feita' ? 'opacity-70' : ''}`}>
                <span className="w-12 shrink-0 text-base font-bold tabular-nums text-stone-900">{s.hora}</span>
                <span aria-hidden className={`h-9 w-1 shrink-0 rounded-full ${s.situacao === 'feita' ? 'bg-stone-300' : 'bg-emerald-600'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{s.nome}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {s.situacao === 'feita' ? <Chip tom="verde"><Check className="size-3.5" aria-hidden />Feita</Chip> : <Chip>{s.tipo === 'pacote' ? 'Pacote' : 'Avulsa'}</Chip>}
                    {s.lembreteAberto && s.situacao !== 'feita' && <span className="inline-flex items-center gap-1 text-[0.8rem] text-stone-500"><MessageCircle className="size-3.5" aria-hidden />lembrete enviado</span>}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Fab href={`/agenda/nova?dia=${selecionado}`} rotulo="Marcar" icone={<Plus className="size-5" aria-hidden />} />
    </div>
  );
}
