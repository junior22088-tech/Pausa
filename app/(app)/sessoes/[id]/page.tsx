import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { dataPorExtenso, diaSP, hora, linkWhatsApp, msgLembrete, reais } from '@/lib/format';
import { cancelarSessao, desfazerFeita, registrarWhatsApp, remarcarSessao, sessaoFeita } from '@/lib/actions';
import { TelaSessao } from '@/components/telas/Sessao';

export default async function Sessao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const { data: s } = await supabase.from('sessoes').select('*, clientes(id, nome, telefone)').eq('id', id).maybeSingle();
  if (!s) notFound();
  const { data: pacote } = s.pacote_id
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
        whatsappHref: linkWhatsApp(s.clientes.telefone, msgLembrete(prof, s.clientes.nome, s.inicio, 'com antecedência')),
      }}
      sessaoFeita={sessaoFeita}
      desfazerFeita={desfazerFeita}
      remarcarSessao={remarcarSessao}
      cancelarSessao={cancelarSessao}
      registrarLembrete={registrarWhatsApp.bind(null, id, 'lembrete')}
    />
  );
}
