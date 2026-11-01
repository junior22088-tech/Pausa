import { carregarProfissional } from '@/lib/dados';
import { dataPorExtenso, diaSP, hora, inicioDoDia, reais, somarDias } from '@/lib/format';
import { TelaHoje, type PendenciaHoje, type SessaoHoje } from '@/components/telas/Hoje';

export default async function Hoje({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const hoje = diaSP();
  const amanha = somarDias(hoje, 1);

  const [{ data: sessoes }, { data: aguardando }, { data: pacotesNaoPagos }, { data: avulsasNaoPagas }] = await Promise.all([
    supabase.from('sessoes').select('id, inicio, situacao, pacote_id, lembrete_aberto_em, clientes(nome, telefone)')
      .gte('inicio', inicioDoDia(hoje).toISOString()).lt('inicio', inicioDoDia(amanha).toISOString())
      .neq('situacao', 'cancelada').order('inicio'),
    supabase.from('pacotes').select('id, clientes(nome)').eq('situacao', 'aguardando_aceite').order('criado_em'),
    supabase.from('pacotes').select('id, valor_centavos, clientes(nome)').eq('pago', false).gt('valor_centavos', 0)
      .in('situacao', ['aguardando_aceite', 'aceito']),
    supabase.from('sessoes').select('id, valor_avulso_centavos, clientes(nome)').is('pacote_id', null)
      .eq('situacao', 'feita').eq('pago', false),
  ]);

  const pendencias: PendenciaHoje[] = [
    ...(aguardando ?? []).map((p: any) => ({ id: p.id, tipo: 'aceite' as const, nome: p.clientes?.nome ?? '', href: `/pacotes/${p.id}/resumo` })),
    ...(pacotesNaoPagos ?? []).map((p: any) => ({ id: p.id, tipo: 'pacote' as const, nome: p.clientes?.nome ?? '', valor: reais(p.valor_centavos), href: `/pagamento?pacote=${p.id}` })),
    ...(avulsasNaoPagas ?? []).map((s: any) => ({ id: s.id, tipo: 'avulsa' as const, nome: s.clientes?.nome ?? '', valor: s.valor_avulso_centavos ? reais(s.valor_avulso_centavos) : undefined, href: `/pagamento?sessao=${s.id}` })),
  ];

  const lista: SessaoHoje[] = (sessoes ?? []).map((s: any) => ({
    id: s.id,
    hora: hora(s.inicio),
    nome: s.clientes?.nome ?? '',
    situacao: s.situacao,
    tipo: s.pacote_id ? 'pacote' : 'avulsa',
    lembreteAberto: !!s.lembrete_aberto_em,
  }));

  return (
    <TelaHoje
      dataExtenso={dataPorExtenso(hoje)}
      hojeISO={hoje}
      configurado={prof.configurado}
      erro={erro}
      pendencias={pendencias}
      sessoes={lista}
    />
  );
}
