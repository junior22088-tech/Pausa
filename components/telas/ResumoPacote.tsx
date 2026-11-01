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

export function TelaResumoPacote({ id, p, texto, aceite, precisaReenviar, editavel, erro, registrar }: {
  id: string; p: any; texto: string; aceite: any; precisaReenviar: boolean; editavel: boolean; erro?: string;
  registrar: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Titulo voltar={`/clientes/${p.cliente_id}`} voltarRotulo={p.clientes.nome}
        acao={editavel ? <Link href={`/pacotes/${id}/editar`} className={btnTexto}><Pencil className="size-4" aria-hidden />Editar</Link> : undefined}>
        Resumo do pacote
      </Titulo>
      <Aviso erro={erro} />
      {precisaReenviar && <Aviso ok={<>Pacote editado (versão {p.versao}). Envie o resumo atualizado; depois marque o aceite.</>} />}
      <Cartao>
        <p className="mb-2 text-base text-stone-600">Mensagem que vai para {p.clientes.nome}:</p>
        <pre className="whitespace-pre-wrap font-sans text-lg">{texto}</pre>
      </Cartao>
      <WhatsAppButton className={`${btnPrimario} w-full`} href={linkWhatsApp(p.clientes.telefone, texto)} registrar={registrar}>
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
          {p.situacao === 'aguardando_aceite' && <p className="mb-1 text-[0.85rem] font-semibold text-amber-800">Aceite anterior (versão {aceite.versao}); a versão atual ainda não foi aceita.</p>}
          <p className="text-lg">✓ Aceite marcado por você em {new Date(aceite.marcado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{aceite.resposta_literal ? ` · resposta: "${aceite.resposta_literal}"` : ''}.</p>
          <p className="mt-1 break-all text-sm text-stone-500">Cópia do texto guardada · código {aceite.hash_sha256.slice(0, 16)}…</p>
          <p className="mt-2 text-base text-stone-600">É um registro do combinado, não um contrato assinado.</p>
        </Cartao>
      )}
      <a href={`/clientes/${p.cliente_id}`} className={`${btnSecundario} w-full`}>Voltar ao cliente</a>
    </div>
  );
}
