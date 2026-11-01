import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { dataPorExtenso, diaSP, hora, linkWhatsApp, msgLembrete, reais } from '@/lib/format';
import { cancelarSessao, desfazerFeita, registrarWhatsApp, remarcarSessao, sessaoFeita } from '@/lib/actions';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Aviso, Cartao, Titulo, btnPerigo, btnPrimario, btnSecundario, campo, rotulo, Confirmar } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function Sessao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const { data: s } = await supabase.from('sessoes').select('*, clientes(nome, telefone)').eq('id', id).maybeSingle();
  if (!s) notFound();

  return (
    <div className="space-y-4">
      <Titulo voltar={`/clientes/${s.cliente_id}`}>{s.clientes.nome}</Titulo>
      <Aviso erro={erro} />
      <Cartao>
        <p className="text-3xl font-bold">{hora(s.inicio)}</p>
        <p className="text-lg capitalize">{dataPorExtenso(s.inicio)}</p>
        <p className="text-base text-stone-600">
          {s.situacao === 'feita' ? 'Feita ✓' : s.situacao === 'cancelada' ? `Cancelada${s.desconta ? ' (descontada)' : ''}` : 'Marcada'}
          {' · '}{s.pacote_id ? 'pacote' : `avulsa${s.valor_avulso_centavos ? ` · ${reais(s.valor_avulso_centavos)}` : ''}${s.situacao === 'feita' ? (s.pago ? ' · paga' : ' · não paga') : ''}`}
        </p>
      </Cartao>

      {s.situacao === 'marcada' && (
        <>
          <form action={sessaoFeita}><input type="hidden" name="id" value={id} /><Enviar className={`${btnPrimario} w-full`}>Feita</Enviar></form>
          <WhatsAppButton className={`${btnSecundario} w-full`} href={linkWhatsApp(s.clientes.telefone, msgLembrete(prof, s.clientes.nome, s.inicio, 'com antecedência'))} registrar={registrarWhatsApp.bind(null, id, 'lembrete')}>
            Lembrar no WhatsApp
          </WhatsAppButton>
          <Cartao>
            <h2 className="mb-2 text-lg font-bold">Remarcar</h2>
            <form action={remarcarSessao} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <label><span className={rotulo}>Dia</span><input type="date" name="dia" defaultValue={diaSP(new Date(s.inicio))} className={campo} required /></label>
                <label><span className={rotulo}>Horário</span><input type="time" name="hora" defaultValue={hora(s.inicio)} step={900} className={campo} required /></label>
              </div>
              <Enviar className={`${btnSecundario} w-full`}>Remarcar</Enviar>
            </form>
          </Cartao>
          <Confirmar rotulo="Cancelar sessão…" pergunta="Cancelar esta sessão? Ela sai da agenda.">
            <form action={cancelarSessao} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              {s.pacote_id && (
                <fieldset className="space-y-2 text-lg">
                  <legend className={rotulo}>Descontar do pacote?</legend>
                  <label className="flex min-h-12 items-center gap-3"><input type="radio" name="desconta" value="nao" defaultChecked className="size-6" /> Não, avisou no prazo</label>
                  <label className="flex min-h-12 items-center gap-3"><input type="radio" name="desconta" value="sim" className="size-6" /> Sim, conforme a regra</label>
                </fieldset>
              )}
              <Enviar className={`${btnPerigo} w-full`}>Sim, cancelar sessão</Enviar>
            </form>
          </Confirmar>
        </>
      )}

      {s.situacao === 'feita' && (
        <>
          {!s.pacote_id && !s.pago && <Link href={`/pagamento?sessao=${id}`} className={`${btnPrimario} w-full`}>Recebi</Link>}
          <Confirmar rotulo="Correção: não foi feita…" pergunta="Desfazer “feita”? A sessão volta para marcada e o saldo volta." className={btnSecundario}>
            <form action={desfazerFeita}><input type="hidden" name="id" value={id} /><Enviar className={`${btnPerigo} w-full`}>Sim, desfazer</Enviar></form>
          </Confirmar>
        </>
      )}
    </div>
  );
}
