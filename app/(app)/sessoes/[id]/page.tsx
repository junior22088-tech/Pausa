import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { dataPorExtenso, diaSP, hora, linkWhatsApp, msgLembrete, msgRemarcarPorFolga, reais } from '@/lib/format';
import { bloqueiosDoDia, hhmm, minutosSP } from '@/lib/agenda-horarios';
import { cancelarSessao, desfazerFeita, registrarWhatsApp, sessaoFeita } from '@/lib/actions';
import { TelaSessao } from '@/components/telas/Sessao';

export default async function Sessao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const { data: s } = await supabase.from('sessoes').select('*, clientes(id, nome, telefone), servicos(nome), pacote_itens(nome)').eq('id', id).maybeSingle();
  if (!s) notFound();
  // A sessão cai numa folga ou bloqueio?
  const dia = diaSP(new Date(s.inicio));
  const { data: bloqueios } = await supabase.from('bloqueios').select('data_inicio, data_fim, dia_inteiro, inicio_min, fim_min, motivo').lte('data_inicio', dia).gte('data_fim', dia);
  const ini = minutosSP(s.inicio);
  const { folgaDiaInteiro, trechos } = bloqueiosDoDia(dia, (bloqueios ?? []) as any);
  const trecho = trechos.find(([a, b]) => ini < b && a < ini + s.duracao_min);
  const folgaTexto = folgaDiaInteiro ? `dia inteiro${folgaDiaInteiro.motivo ? ` (${folgaDiaInteiro.motivo})` : ''}` : trecho ? `${hhmm(trecho[0])} às ${hhmm(trecho[1])}` : null;

  // Saldo do serviço dentro do pacote (sessão antiga sem item: saldo do pacote todo).
  const { data: pacote } = s.pacote_item_id
    ? await supabase.from('pacote_itens_saldo').select('saldo').eq('id', s.pacote_item_id).maybeSingle()
    : s.pacote_id
      ? await supabase.from('pacotes_saldo').select('saldo').eq('id', s.pacote_id).maybeSingle()
      : { data: null };

  return (
    <TelaSessao
      erro={erro}
      s={{
        id,
        cliente: { id: s.cliente_id, nome: s.clientes.nome },
        hora: hora(s.inicio),
        diaExtenso: dataPorExtenso(s.inicio),
        diaISO: diaSP(new Date(s.inicio)),
        situacao: s.situacao,
        descontada: !!s.desconta && !!s.pacote_id,
        temPacote: !!s.pacote_id,
        saldoPacote: pacote?.saldo ?? null,
        valorAvulso: s.valor_avulso_centavos ? reais(s.valor_avulso_centavos) : null,
        pago: !!s.pago,
        lembreteAberto: !!s.lembrete_aberto_em,
        servico: s.servicos?.nome ?? s.pacote_itens?.nome ?? null,
        fim: hhmm(ini + s.duracao_min),
        folga: folgaTexto ? { texto: folgaTexto, avisoHref: linkWhatsApp(s.clientes.telefone, msgRemarcarPorFolga(prof, s.clientes.nome, s.inicio)) } : null,
        whatsappHref: linkWhatsApp(s.clientes.telefone, msgLembrete(prof, s.clientes.nome, s.inicio, 'com antecedência')),
      }}
      sessaoFeita={sessaoFeita}
      desfazerFeita={desfazerFeita}
      cancelarSessao={cancelarSessao}
      registrarLembrete={registrarWhatsApp.bind(null, id, 'lembrete')}
      registrarAvisoFolga={registrarWhatsApp.bind(null, id, 'aviso_folga')}
    />
  );
}
