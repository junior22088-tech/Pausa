import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { linkWhatsApp, msgResumoPacote } from '@/lib/format';
import { marcarAceite, marcarDesistencia, registrarEnvioResumo } from '@/lib/actions';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Aviso, Cartao, Titulo, btnPerigo, btnPrimario, btnSecundario, campo, rotulo, Confirmar } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function ResumoPacote({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const { data: p } = await supabase.from('pacotes').select('*, clientes(nome, telefone), servicos(nome, duracao_min)').eq('id', id).maybeSingle();
  if (!p) notFound();
  const { data: aceite } = await supabase.from('aceites').select('marcado_em, resposta_literal, hash_sha256').eq('pacote_id', id).order('versao', { ascending: false }).limit(1).maybeSingle();
  const texto = msgResumoPacote(prof, p.clientes.nome, p.total_sessoes, p.valor_centavos, p.pago, p.validade_ate, p.regra_cancelamento, p.servicos);

  return (
    <div className="space-y-4">
      <Titulo voltar={`/clientes/${p.cliente_id}`}>Resumo do pacote</Titulo>
      <Aviso erro={erro} />
      <Cartao>
        <p className="mb-2 text-base text-stone-600">Mensagem que vai para {p.clientes.nome}:</p>
        <pre className="whitespace-pre-wrap font-sans text-lg">{texto}</pre>
      </Cartao>
      <WhatsAppButton className={`${btnPrimario} w-full`} href={linkWhatsApp(p.clientes.telefone, texto)} registrar={registrarEnvioResumo.bind(null, id, texto)}>
        Enviar no WhatsApp
      </WhatsAppButton>

      {p.situacao === 'aguardando_aceite' && (
        <Cartao>
          <h2 className="mb-2 text-lg font-bold">O cliente respondeu?</h2>
          <form action={marcarAceite} className="space-y-3">
            <input type="hidden" name="pacote_id" value={id} />
            <label className="block">
              <span className={rotulo}>O que ele escreveu (opcional)</span>
              <input name="resposta" placeholder='Ex.: "ACEITO", "ok", 👍' className={campo} />
            </label>
            <Enviar className={`${btnPrimario} w-full`}>Aceitou</Enviar>
          </form>
          <div className="mt-3">
            <Confirmar rotulo="Desistiu…" pergunta="Marcar que o cliente desistiu deste pacote?">
              <form action={marcarDesistencia}>
                <input type="hidden" name="pacote_id" value={id} />
                <Enviar className={`${btnPerigo} w-full`}>Sim, desistiu</Enviar>
              </form>
            </Confirmar>
          </div>
          <p className="mt-3 text-base text-stone-500">"Tem dúvida"? Converse no WhatsApp; o pacote continua aguardando aqui.</p>
        </Cartao>
      )}

      {aceite && (
        <Cartao>
          <p className="text-lg">✓ Aceite marcado por você em {new Date(aceite.marcado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{aceite.resposta_literal ? ` · resposta: "${aceite.resposta_literal}"` : ''}.</p>
          <p className="mt-1 break-all text-sm text-stone-500">Cópia do texto guardada · código {aceite.hash_sha256.slice(0, 16)}…</p>
          <p className="mt-2 text-base text-stone-600">É um registro do combinado, não um contrato assinado.</p>
        </Cartao>
      )}
      <a href={`/clientes/${p.cliente_id}`} className={`${btnSecundario} w-full`}>Voltar ao cliente</a>
    </div>
  );
}
