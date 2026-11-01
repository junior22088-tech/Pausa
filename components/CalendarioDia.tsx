import Link from 'next/link';
import { CalendarOff, Check, MessageCircle, Plus } from 'lucide-react';
import { hhmm } from '@/lib/agenda-horarios';

export type BlocoSessao = {
  id: string; inicio: number; fimAtendimento: number; fimOcupado: number;
  nome: string; servico?: string; situacao: 'marcada' | 'feita'; lembreteAberto: boolean;
};
export type DiaCalendario = {
  expediente: [number, number] | null;
  almoco: [number, number] | null;
  folgaDia: string | null;
  trechos: { inicio: number; fim: number; motivo?: string | null }[];
  sessoes: BlocoSessao[];
  livres: [number, number][];
};

const PX = 1.15; // pixels por minuto: 1 hora = 69 px
const y = (min: number, base: number) => (min - base) * PX;

/** Grade de horas do dia, com as sessões no tamanho da duração. */
export function CalendarioDia({ dia, d, marcarHref }: { dia: string; d: DiaCalendario; marcarHref: (hora?: string) => string }) {
  const pontos = [
    ...(d.expediente ?? []),
    ...d.sessoes.flatMap((s) => [s.inicio, s.fimOcupado]),
  ];
  if (pontos.length === 0) return null;
  const base = Math.floor(Math.min(...pontos) / 60) * 60;
  const topo = Math.ceil(Math.max(...pontos) / 60) * 60;
  const horas = Array.from({ length: (topo - base) / 60 + 1 }, (_, i) => base + i * 60);
  const altura = (topo - base) * PX;

  return (
    <div className="relative rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80" aria-label={`Calendário de ${dia}`}>
      <div className="relative" style={{ height: altura }}>
        {/* Linhas das horas */}
        {horas.map((h) => (
          <div key={h} className="absolute inset-x-0 flex items-start" style={{ top: y(h, base) }}>
            <span className="-mt-2 w-11 shrink-0 text-[0.7rem] font-semibold tabular-nums text-stone-400">{hhmm(h)}</span>
            <span className="flex-1 border-t border-stone-100" />
          </div>
        ))}

        <div className="absolute inset-y-0 left-12 right-0">
          {/* Fora do expediente */}
          {d.expediente && d.expediente[0] > base && <div className="absolute inset-x-0 rounded-md bg-stone-50" style={{ top: 0, height: y(d.expediente[0], base) }} />}
          {d.expediente && d.expediente[1] < topo && <div className="absolute inset-x-0 rounded-md bg-stone-50" style={{ top: y(d.expediente[1], base), height: (topo - d.expediente[1]) * PX }} />}
          {/* Almoço */}
          {d.almoco && (
            <div className="absolute inset-x-0 flex items-center justify-center rounded-lg bg-stone-100 text-[0.75rem] font-semibold text-stone-500" style={{ top: y(d.almoco[0], base), height: (d.almoco[1] - d.almoco[0]) * PX }}>
              Almoço
            </div>
          )}
          {/* Bloqueios de parte do dia */}
          {d.trechos.map((t, i) => (
            <div key={i} className="absolute inset-x-0 flex items-center justify-center gap-1 rounded-lg bg-amber-50 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200" style={{ top: y(t.inicio, base), height: (t.fim - t.inicio) * PX }}>
              <CalendarOff className="size-3.5" aria-hidden />Bloqueado{t.motivo ? ` · ${t.motivo}` : ''}
            </div>
          ))}
          {/* Espaços livres: tocar leva a marcar */}
          {d.livres.filter(([a, b]) => b - a >= 30).map(([a, b]) => (
            <Link key={a} href={marcarHref(hhmm(a))} className="absolute inset-x-1 flex items-center justify-center gap-1 rounded-lg border border-dashed border-stone-200 text-[0.75rem] font-semibold text-stone-400 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700" style={{ top: y(a, base) + 2, height: (b - a) * PX - 4 }} aria-label={`Livre das ${hhmm(a)} às ${hhmm(b)}: marcar`}>
              <Plus className="size-3.5" aria-hidden />Livre {hhmm(a)}–{hhmm(b)}
            </Link>
          ))}
          {/* Sessões */}
          {d.sessoes.map((s) => {
            const feita = s.situacao === 'feita';
            const alto = (s.fimAtendimento - s.inicio) * PX;
            return (
              <div key={s.id}>
                <Link
                  href={`/sessoes/${s.id}`}
                  className={`absolute inset-x-0 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 shadow-sm ${feita ? 'border-stone-300 bg-stone-100 text-stone-500' : 'border-emerald-600 bg-emerald-50 text-emerald-950 hover:bg-emerald-100'}`}
                  style={{ top: y(s.inicio, base), height: alto }}
                >
                  <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold tabular-nums">
                    {hhmm(s.inicio)}–{hhmm(s.fimAtendimento)}
                    {feita && <Check className="size-3.5" aria-label="feita" />}
                    {s.lembreteAberto && !feita && <MessageCircle className="size-3.5" aria-label="lembrete enviado" />}
                  </span>
                  <span className="block truncate text-[0.95rem] font-semibold leading-tight">{s.nome}</span>
                  {alto >= 62 && s.servico && <span className="block truncate text-[0.75rem] opacity-80">{s.servico}</span>}
                </Link>
                {s.fimOcupado > s.fimAtendimento && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0 rounded-b-lg bg-[repeating-linear-gradient(135deg,var(--color-stone-200)_0_4px,transparent_4px_8px)] text-center text-[0.65rem] font-semibold leading-none text-stone-500"
                    style={{ top: y(s.fimAtendimento, base), height: (s.fimOcupado - s.fimAtendimento) * PX }}
                  >
                    {(s.fimOcupado - s.fimAtendimento) * PX >= 14 && <span className="relative top-0.5">intervalo</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
