import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { chaveAnamnese, decifrar } from '@/lib/cripto';
import { MODELOS, alertas, type Respostas } from '@/lib/anamnese-modelo';
import { linkWhatsApp, msgConsentimentoAnamnese } from '@/lib/format';
import {
  anamneseDesbloqueada, bloquearAnamnese, desbloquearAnamnese, marcarAutorizacaoAnamnese,
  registrarPedidoAnamnese, revogarEApagarAnamnese, salvarAnamnese,
} from '@/lib/acoes-anamnese';
import { TelaAnamnese, type DadosAnamnese } from '@/components/telas/Anamnese';

export const dynamic = 'force-dynamic';

const quando = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default async function Anamnese({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; editar?: string }> }) {
  const { id } = await params;
  const { erro, editar } = await searchParams;
  const { supabase, user, prof } = await carregarProfissional();
  const { data: cliente } = await supabase.from('clientes').select('id, nome, telefone').eq('id', id).maybeSingle();
  if (!cliente) notFound();

  const chave = chaveAnamnese();
  const [{ data: consentimento }, { data: versoes }, { data: acessos }, { data: pedido }] = await Promise.all([
    supabase.from('anamnese_consentimentos').select('marcado_em, resposta_literal').eq('cliente_id', id).is('revogado_em', null).order('marcado_em', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('anamneses').select('versao, criado_em').eq('cliente_id', id).order('versao', { ascending: false }),
    supabase.from('anamnese_acessos').select('acao, em').eq('cliente_id', id).order('em', { ascending: false }).limit(10),
    supabase.from('eventos').select('id').eq('cliente_id', id).eq('entidade', 'anamnese').eq('tipo', 'abriu_whatsapp').limit(1).maybeSingle(),
  ]);

  const aberta = !!chave && !!consentimento && (await anamneseDesbloqueada(user.id));
  const estado: DadosAnamnese['estado'] = !chave ? 'sem_chave' : !consentimento ? 'sem_consentimento' : aberta ? 'aberta' : 'bloqueada';

  // Só decifra quando a ficha está aberta; cada abertura fica no registro de acesso.
  let respostas: Respostas | null = null;
  let modelo = MODELOS.padrao;
  let erroLeitura: string | undefined;
  if (estado === 'aberta' && versoes?.length) {
    const { data: ultima } = await supabase.from('anamneses').select('modelo, conteudo_cifrado').eq('cliente_id', id).eq('versao', versoes[0].versao).single();
    modelo = MODELOS[ultima?.modelo ?? 'padrao'] ?? MODELOS.padrao;
    try {
      respostas = decifrar<Respostas>(chave!, ultima!.conteudo_cifrado, user.id, id);
    } catch {
      erroLeitura = 'Não foi possível abrir a ficha: a chave de proteção desta instalação mudou. Recoloque a chave antiga em PAUSA_ANAMNESE_CHAVE.';
    }
    if (!editar) await supabase.from('anamnese_acessos').insert({ cliente_id: id, acao: 'abriu' });
  }

  const texto = msgConsentimentoAnamnese(prof, cliente.nome.split(' ')[0]);
  const d: DadosAnamnese = {
    cliente: { id, nome: cliente.nome },
    estado,
    pedidoEnviado: !!pedido,
    pedido: { href: linkWhatsApp(cliente.telefone, texto), registrar: registrarPedidoAnamnese.bind(null, id, texto) },
    consentimento: consentimento ? { data: quando(consentimento.marcado_em), resposta: consentimento.resposta_literal } : undefined,
    modelo,
    respostas,
    erroLeitura,
    alertas: respostas ? alertas(modelo, respostas) : [],
    versoes: (versoes ?? []).map((v) => ({ versao: v.versao, data: quando(v.criado_em) })),
    acessos: (acessos ?? []).map((a) => ({ acao: a.acao, data: quando(a.em) })),
    editar: editar === '1',
  };
  return (
    <TelaAnamnese d={d} erro={erro} acoes={{
      autorizar: marcarAutorizacaoAnamnese, desbloquear: desbloquearAnamnese, bloquear: bloquearAnamnese,
      salvar: salvarAnamnese, revogar: revogarEApagarAnamnese,
    }} />
  );
}
