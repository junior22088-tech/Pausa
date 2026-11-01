// Carrega do banco o que o cálculo de horários livres precisa.
import type { Bloqueio, DiaSemanaCfg, Ocupado } from '@/lib/agenda-horarios';
import { minutosSP } from '@/lib/agenda-horarios';
import { inicioDoDia, somarDias } from '@/lib/format';

type Supa = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export type Servico = { id: string; nome: string; duracao_min: number; preco_centavos: number | null; ativo: boolean };

export async function configAgenda(supabase: Supa, userId: string) {
  const [{ data: semana }, { data: bloqueios }, { data: prof }, { data: servicos }] = await Promise.all([
    supabase.from('horarios_semana').select('dia_semana, atende, inicio_min, fim_min, almoco_inicio_min, almoco_fim_min').order('dia_semana'),
    supabase.from('bloqueios').select('id, data_inicio, data_fim, dia_inteiro, inicio_min, fim_min, motivo').order('data_inicio'),
    supabase.from('profissionais').select('intervalo_min').eq('id', userId).single(),
    supabase.from('servicos').select('id, nome, duracao_min, preco_centavos, ativo').order('nome'),
  ]);
  return {
    semana: (semana ?? []) as DiaSemanaCfg[],
    bloqueios: (bloqueios ?? []) as Bloqueio[],
    intervalo: prof?.intervalo_min ?? 15,
    servicos: (servicos ?? []) as Servico[],
  };
}

export type SessaoDoDia = Ocupado & { situacao: string; clienteId: string; duracao: number };

/** Sessões ativas (não canceladas) que começam no dia. */
export async function sessoesDoDia(supabase: Supa, dia: string): Promise<SessaoDoDia[]> {
  const { data } = await supabase.from('sessoes')
    .select('id, inicio, ocupado_ate, duracao_min, situacao, cliente_id, clientes(nome), servicos(nome)')
    .gte('inicio', inicioDoDia(dia).toISOString()).lt('inicio', inicioDoDia(somarDias(dia, 1)).toISOString())
    .neq('situacao', 'cancelada').order('inicio');
  return (data ?? []).map((s: any) => {
    const ini = minutosSP(s.inicio);
    return {
      id: s.id, inicio: ini, fim: Math.min(1440, ini + Math.round((new Date(s.ocupado_ate).getTime() - new Date(s.inicio).getTime()) / 60000)),
      fimAtendimento: ini + s.duracao_min, duracao: s.duracao_min,
      nome: s.clientes?.nome ?? '', servico: s.servicos?.nome ?? undefined, situacao: s.situacao, clienteId: s.cliente_id,
    };
  });
}

/** Sessões ativas entre dois dias (fim exclusivo), agrupadas por dia AAAA-MM-DD. */
export async function sessoesPorDia(supabase: Supa, de: string, ateExclusivo: string) {
  const { data } = await supabase.from('sessoes')
    .select('id, inicio, ocupado_ate, duracao_min, situacao, cliente_id, clientes(nome), servicos(nome)')
    .gte('inicio', inicioDoDia(de).toISOString()).lt('inicio', inicioDoDia(ateExclusivo).toISOString())
    .neq('situacao', 'cancelada').order('inicio');
  const mapa = new Map<string, SessaoDoDia[]>();
  for (const s of (data ?? []) as any[]) {
    const ini = minutosSP(s.inicio);
    const dia = new Date(new Date(s.inicio).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
    const item: SessaoDoDia = {
      id: s.id, inicio: ini, fim: Math.min(1440, ini + Math.round((new Date(s.ocupado_ate).getTime() - new Date(s.inicio).getTime()) / 60000)),
      fimAtendimento: ini + s.duracao_min, duracao: s.duracao_min,
      nome: s.clientes?.nome ?? '', servico: s.servicos?.nome ?? undefined, situacao: s.situacao, clienteId: s.cliente_id,
    };
    mapa.set(dia, [...(mapa.get(dia) ?? []), item]);
  }
  return mapa;
}

/** Tudo que a escolha de horário precisa: faixa da semana (com contagem de livres) e os livres do dia. */
export async function montarEscolha(
  supabase: Supa, userId: string,
  { dia, duracao, intervalo, ignorarId }: { dia: string; duracao: number; intervalo?: number; ignorarId?: string },
) {
  const { diaSP } = await import('@/lib/format');
  const cfg = await configAgenda(supabase, userId);
  const iv = intervalo ?? cfg.intervalo;
  const hoje = diaSP();
  const meioDia = (iso: string) => new Date(`${iso}T12:00:00-03:00`);
  const segunda = somarDias(dia, -((meioDia(dia).getUTCDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const porDia = await sessoesPorDia(supabase, segunda, somarDias(segunda, 7));
  const agora = minutosSP(new Date());
  const { horariosLivres } = await import('@/lib/agenda-horarios');
  const calc = (d: string) => horariosLivres({
    dia: d, duracao, intervalo: iv, semana: cfg.semana, bloqueios: cfg.bloqueios,
    ocupados: porDia.get(d) ?? [], ignorarId, agoraMin: d === hoje ? agora : null,
  });
  const fmt = (o: Intl.DateTimeFormatOptions, iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(meioDia(iso));
  const semana = dias.map((d) => ({
    iso: d, sigla: fmt({ weekday: 'short' }, d).replace('.', ''), numero: fmt({ day: 'numeric' }, d),
    hoje: d === hoje, passado: d < hoje, livres: d < hoje ? 0 : calc(d).normais.length,
  }));
  return {
    semana, livres: calc(dia), intervalo: iv, servicos: cfg.servicos,
    anterior: somarDias(dia, -7) < hoje ? hoje : somarDias(dia, -7), proxima: somarDias(dia, 7),
    tituloDia: fmt({ weekday: 'long', day: 'numeric', month: 'long' }, dia),
  };
}
