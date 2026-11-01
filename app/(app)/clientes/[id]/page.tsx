import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { dataCurta, dataPorExtenso, hora, linkWhatsApp, reais, telefoneBonito } from '@/lib/format';
import { anularPagamento } from '@/lib/actions';
import { TelaFichaCliente, type FichaDados } from '@/components/telas/FichaCliente';

const FORMA: Record<string, string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };

export default async function ClienteDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; aba?: string }> }) {
  const { id } = await params;
  const { ok, aba } = await searchParams;
  const { supabase } = await carregarProfissional();
  const [{ data: c }, { data: pacotes }, { data: proximas }, { data: pagamentos }, { data: eventos }] = await Promise.all([
    supabase.from('clientes').select('id, nome, telefone').eq('id', id).maybeSingle(),
    supabase.from('pacotes_saldo').select('*').eq('cliente_id', id).order('criado_em', { ascending: false }),
    supabase.from('sessoes').select('id, inicio').eq('cliente_id', id).eq('situacao', 'marcada').order('inicio').limit(20),
    supabase.from('pagamentos').select('id, valor_centavos, forma, recebido_em, anulado_em').eq('cliente_id', id).order('recebido_em', { ascending: false }).limit(30),
    supabase.from('eventos').select('id, descricao, criado_em').eq('cliente_id', id).order('criado_em', { ascending: false }).limit(50),
  ]);
  if (!c) notFound();
  const ativo: any = pacotes?.find((p: any) => ['aguardando_aceite', 'aceito'].includes(p.situacao));

  const dados: FichaDados = {
    cliente: { id: c.id, nome: c.nome, telefone: c.telefone, telefoneBonito: telefoneBonito(c.telefone) },
    whatsappHref: linkWhatsApp(c.telefone, ''),
    pacote: ativo ? {
      id: ativo.id, total: ativo.total_sessoes, usadas: ativo.sessoes_usadas, saldo: ativo.saldo,
      valor: reais(ativo.valor_centavos), validade: dataPorExtenso(ativo.validade_ate, false),
      situacao: ativo.situacao, pago: ativo.pago,
    } : null,
    proximas: (proximas ?? []).map((s) => ({ id: s.id, dia: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(s.inicio)).replace('.', ''), hora: hora(s.inicio) })),
    pagamentos: (pagamentos ?? []).map((p) => ({ id: p.id, data: dataCurta(p.recebido_em), valor: reais(p.valor_centavos), forma: FORMA[p.forma] ?? p.forma, anulado: !!p.anulado_em })),
    eventos: (eventos ?? []).map((e) => ({ id: e.id, data: dataCurta(e.criado_em), hora: hora(e.criado_em), descricao: e.descricao })),
  };
  return <TelaFichaCliente dados={dados} aba={aba ?? 'sessoes'} ok={ok} anularPagamento={anularPagamento} />;
}
