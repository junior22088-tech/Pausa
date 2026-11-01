import { carregarProfissional } from '@/lib/dados';
import { configAgenda, sessoesPorDia } from '@/lib/agenda-dados';
import { bloqueiosDoDia, diaDaSemana, espacosLivres, minutosSP } from '@/lib/agenda-horarios';
import { diaSP, somarDias } from '@/lib/format';
import { TelaAgenda, type DiaSemana } from '@/components/telas/Agenda';

const TZ = 'America/Sao_Paulo';
const meioDia = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const hoje = diaSP();
  const selecionado = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hoje;
  const segunda = somarDias(selecionado, -((meioDia(selecionado).getUTCDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));

  const { supabase, user } = await carregarProfissional();
  const [cfg, porDia, { data: lembretes }] = await Promise.all([
    configAgenda(supabase, user.id),
    sessoesPorDia(supabase, segunda, somarDias(segunda, 7)),
    supabase.from('sessoes').select('id').not('lembrete_aberto_em', 'is', null)
      .gte('inicio', `${selecionado}T00:00:00-03:00`).lt('inicio', `${somarDias(selecionado, 1)}T00:00:00-03:00`),
  ]);
  const comLembrete = new Set((lembretes ?? []).map((l) => l.id));
  const fmt = (o: Intl.DateTimeFormatOptions, iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...o }).format(meioDia(iso));

  const semana: DiaSemana[] = dias.map((d) => ({
    iso: d, sigla: fmt({ weekday: 'short' }, d).replace('.', ''), numero: fmt({ day: 'numeric' }, d),
    hoje: d === hoje, qtd: porDia.get(d)?.length ?? 0,
  }));

  const doDia = porDia.get(selecionado) ?? [];
  const c = cfg.semana.find((x) => x.dia_semana === diaDaSemana(selecionado));
  const { folgaDiaInteiro, trechos } = bloqueiosDoDia(selecionado, cfg.bloqueios);
  const trechosDetalhe = cfg.bloqueios.filter((b) => !b.dia_inteiro && b.data_inicio <= selecionado && selecionado <= b.data_fim);

  return (
    <TelaAgenda
      mes={fmt({ month: 'long', year: 'numeric' }, selecionado)}
      semana={semana}
      selecionado={selecionado}
      tituloDia={fmt({ weekday: 'long', day: 'numeric', month: 'long' }, selecionado)}
      semanaAnterior={somarDias(selecionado, -7)}
      proximaSemana={somarDias(selecionado, 7)}
      hojeISO={hoje}
      semServicos={cfg.servicos.filter((s) => s.ativo).length === 0}
      calendario={{
        expediente: c?.atende ? [c.inicio_min, c.fim_min] : null,
        almoco: c?.atende && c.almoco_inicio_min != null && c.almoco_fim_min != null ? [c.almoco_inicio_min, c.almoco_fim_min] : null,
        folgaDia: folgaDiaInteiro ? (folgaDiaInteiro.motivo ? `Dia de folga: ${folgaDiaInteiro.motivo}.` : 'Dia marcado como folga.') + (doDia.length ? ` Há ${doDia.length} ${doDia.length === 1 ? 'sessão marcada' : 'sessões marcadas'}.` : '') : null,
        trechos: trechos.map(([a, b], i) => ({ inicio: a, fim: b, motivo: trechosDetalhe[i]?.motivo })),
        sessoes: doDia.map((s) => ({
          id: s.id, inicio: s.inicio, fimAtendimento: s.fimAtendimento ?? s.inicio + s.duracao, fimOcupado: s.fim,
          nome: s.nome ?? '', servico: s.servico, situacao: s.situacao as 'marcada' | 'feita', lembreteAberto: comLembrete.has(s.id),
        })),
        livres: espacosLivres({ dia: selecionado, semana: cfg.semana, bloqueios: cfg.bloqueios, ocupados: doDia, agoraMin: selecionado === hoje ? minutosSP(new Date()) : selecionado < hoje ? 1440 : null }),
      }}
    />
  );
}
