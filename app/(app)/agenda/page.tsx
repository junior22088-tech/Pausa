import Link from 'next/link';
import { carregarProfissional } from '@/lib/dados';
import { dataPorExtenso, diaSP, hora, inicioDoDia, somarDias } from '@/lib/format';
import { Cartao, Titulo } from '@/components/ui';

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const inicio = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : diaSP();
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const { supabase } = await carregarProfissional();
  const { data: sessoes } = await supabase.from('sessoes').select('id, inicio, situacao, clientes(nome)')
    .gte('inicio', inicioDoDia(dias[0]).toISOString()).lt('inicio', inicioDoDia(somarDias(inicio, 7)).toISOString())
    .neq('situacao', 'cancelada').order('inicio');

  return (
    <div>
      <Titulo>Agenda</Titulo>
      <div className="mb-4 flex justify-between text-lg font-semibold text-emerald-800">
        <Link href={`/agenda?dia=${somarDias(inicio, -7)}`}>‹ Semana anterior</Link>
        <Link href={`/agenda?dia=${somarDias(inicio, 7)}`}>Próxima ›</Link>
      </div>
      <div className="space-y-3">
        {dias.map((d) => {
          const doDia = sessoes?.filter((s: any) => diaSP(new Date(s.inicio)) === d) ?? [];
          return (
            <Cartao key={d}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold capitalize">{d === diaSP() ? 'Hoje · ' : ''}{dataPorExtenso(d)}</h2>
                <Link href={`/agenda/nova?dia=${d}`} className="text-lg font-semibold text-emerald-800">+ Marcar</Link>
              </div>
              {doDia.length === 0 && <p className="text-base text-stone-500">Livre</p>}
              <ul className="space-y-1">
                {doDia.map((s: any) => (
                  <li key={s.id}>
                    <Link href={`/sessoes/${s.id}`} className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-lg hover:bg-stone-100">
                      <span className="font-bold">{hora(s.inicio)}</span>
                      <span>{s.clientes?.nome}</span>
                      {s.situacao === 'feita' && <span className="text-emerald-700">✓</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Cartao>
          );
        })}
      </div>
    </div>
  );
}
