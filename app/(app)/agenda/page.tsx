import { carregarProfissional } from '@/lib/dados';
import { diaSP, hora, inicioDoDia, somarDias } from '@/lib/format';
import { TelaAgenda, type DiaSemana, type SessaoAgenda } from '@/components/telas/Agenda';

const TZ = 'America/Sao_Paulo';
const meioDia = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const hoje = diaSP();
  const selecionado = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hoje;
  // Semana de segunda a domingo que contém o dia escolhido.
  const segunda = somarDias(selecionado, -((meioDia(selecionado).getUTCDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));

  const { supabase } = await carregarProfissional();
  const { data: sessoes } = await supabase.from('sessoes').select('id, inicio, situacao, pacote_id, lembrete_aberto_em, clientes(nome)')
    .gte('inicio', inicioDoDia(dias[0]).toISOString()).lt('inicio', inicioDoDia(somarDias(segunda, 7)).toISOString())
    .neq('situacao', 'cancelada').order('inicio');

  const porDia = new Map<string, any[]>();
  for (const s of sessoes ?? []) {
    const d = diaSP(new Date(s.inicio));
    porDia.set(d, [...(porDia.get(d) ?? []), s]);
  }
  const fmt = (o: Intl.DateTimeFormatOptions, iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...o }).format(meioDia(iso));

  const semana: DiaSemana[] = dias.map((d) => ({
    iso: d,
    sigla: fmt({ weekday: 'short' }, d).replace('.', ''),
    numero: fmt({ day: 'numeric' }, d),
    hoje: d === hoje,
    qtd: porDia.get(d)?.length ?? 0,
  }));
  const lista: SessaoAgenda[] = (porDia.get(selecionado) ?? []).map((s: any) => ({
    id: s.id, hora: hora(s.inicio), nome: s.clientes?.nome ?? '', situacao: s.situacao,
    tipo: s.pacote_id ? 'pacote' : 'avulsa', lembreteAberto: !!s.lembrete_aberto_em,
  }));

  return (
    <TelaAgenda
      mes={fmt({ month: 'long', year: 'numeric' }, selecionado)}
      semana={semana}
      selecionado={selecionado}
      tituloDia={fmt({ weekday: 'long', day: 'numeric', month: 'long' }, selecionado)}
      sessoes={lista}
      semanaAnterior={somarDias(selecionado, -7)}
      proximaSemana={somarDias(selecionado, 7)}
      hojeISO={hoje}
    />
  );
}
