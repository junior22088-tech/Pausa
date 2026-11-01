import { TelaResumoPacote } from '@/components/telas/ResumoPacote';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { itensDosPacotes } from '@/lib/pacotes';
import { linkWhatsApp, msgResumoPacote } from '@/lib/format';
import { marcarAceite, marcarDesistencia, registrarEnvioResumo } from '@/lib/actions';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Aviso, Cartao, Titulo, btnPerigo, btnPrimario, btnSecundario, btnTexto, campo, rotulo, Confirmar } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function ResumoPacote({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const { data: p } = await supabase.from('pacotes').select('*, clientes(nome, telefone)').eq('id', id).maybeSingle();
  if (!p) notFound();
  const [itens, { data: aceite }, { data: envio }] = await Promise.all([
    itensDosPacotes(supabase, [id]),
    supabase.from('aceites').select('marcado_em, resposta_literal, hash_sha256, versao').eq('pacote_id', id).order('marcado_em', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('eventos').select('depois').eq('entidade_id', id).eq('tipo', 'abriu_whatsapp').order('criado_em', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const texto = msgResumoPacote(prof, p.clientes.nome, itens, p.valor_centavos, p.pago, p.validade_ate, p.regra_cancelamento, p.versao);
  const versaoEnviada = envio ? ((envio.depois as { versao?: number } | null)?.versao ?? 1) : null;
  const precisaReenviar = p.situacao === 'aguardando_aceite' && p.versao > 1 && versaoEnviada !== p.versao;
  const editavel = ['aguardando_aceite', 'aceito'].includes(p.situacao);

  return <TelaResumoPacote id={id} p={p} texto={texto} aceite={aceite} precisaReenviar={precisaReenviar} editavel={editavel} erro={erro} registrar={registrarEnvioResumo.bind(null, id, texto)} />;
}
