import Link from 'next/link';
import { CalendarOff, CalendarPlus, ChevronLeft, ChevronRight, Plus, Settings2 } from 'lucide-react';
import { Fab, Vazio, btnPrimario } from '@/components/ui';
import { CalendarioDia, type DiaCalendario } from '@/components/CalendarioDia';

export type DiaSemana = { iso: string; sigla: string; numero: string; hoje: boolean; qtd: number };

export function TelaAgenda({
  mes, semana, selecionado, tituloDia, calendario, semanaAnterior, proximaSemana, hojeISO, semServicos = false,
}: {
  mes: string; semana: DiaSemana[]; selecionado: string; tituloDia: string; calendario: DiaCalendario;
  semanaAnterior: string; proximaSemana: string; hojeISO: string; semServicos?: boolean;
}) {
  const sessoes = calendario.sessoes;
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

      {semServicos && (
        <Link href="/ajustes/servicos" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-[0.9rem] text-amber-950 ring-1 ring-amber-200">
          <Settings2 className="size-5 shrink-0" aria-hidden />
          <span>Cadastre seus serviços e horários de atendimento para a agenda mostrar os horários livres. <b className="underline">Configurar</b></span>
        </Link>
      )}

      {calendario.folgaDia ? (
        <Vazio icone={<CalendarOff className="size-6" aria-hidden />} titulo="Folga" texto={calendario.folgaDia}
          acao={sessoes.length ? <Link href="/ajustes/folgas" className={btnPrimario}>Ver sessões para remarcar</Link> : undefined} />
      ) : !calendario.expediente && sessoes.length === 0 ? (
        <Vazio icone={<CalendarPlus className="size-6" aria-hidden />} titulo="Você não atende neste dia"
          texto="Ainda dá para marcar fora do expediente."
          acao={<Link href={`/agenda/nova?dia=${selecionado}`} className={btnPrimario}><Plus className="size-5" aria-hidden />Marcar neste dia</Link>} />
      ) : (
        <CalendarioDia dia={selecionado} d={calendario} marcarHref={(h) => `/agenda/nova?dia=${selecionado}${h ? `&hora=${h}` : ''}`} />
      )}

      <Fab href={`/agenda/nova?dia=${selecionado}`} rotulo="Marcar" icone={<Plus className="size-5" aria-hidden />} />
    </div>
  );
}
