import { notFound, redirect } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { itensDosPacotes } from '@/lib/pacotes';
import { editarPacote } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { ItensPacote } from '@/components/ItensPacote';

export default async function EditarPacote({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await carregarProfissional();
  const { data: p } = await supabase.from('pacotes').select('id, cliente_id, valor_centavos, validade_ate, regra_cancelamento, situacao, versao, clientes(nome)').eq('id', id).maybeSingle();
  if (!p) notFound();
  if (!['aguardando_aceite', 'aceito'].includes(p.situacao)) redirect(`/pacotes/${id}/resumo`);
  const [itens, { data: servicos }] = await Promise.all([
    itensDosPacotes(supabase, [id]),
    supabase.from('servicos').select('id, nome, duracao_min, preco_centavos').eq('ativo', true).order('nome'),
  ]);
  const cliente = (p.clientes as unknown as { nome: string }).nome;

  return (
    <form action={editarPacote} className="space-y-6 pb-8">
      <Titulo voltar={`/pacotes/${id}/resumo`} voltarRotulo="Resumo">Editar pacote</Titulo>
      <Aviso erro={erro} />
      <input type="hidden" name="id" value={id} />
      <p className="-mt-3 text-[0.9rem] text-stone-600">
        Pacote de {cliente}.{' '}
        {p.situacao === 'aceito'
          ? <>Ao salvar, ele volta para <strong>aguardando aceite</strong> e você reenvia o resumo. O aceite anterior fica guardado no histórico.</>
          : <>Ao salvar, reenvie o resumo atualizado antes de marcar o aceite.</>}
      </p>

      <ItensPacote servicos={servicos ?? []} valorInicial={p.valor_centavos} iniciais={itens.map((i) => ({
        id: i.id, servico_id: i.servico_id, nome: i.nome, duracao_min: i.duracao_min, quantidade: i.quantidade,
        preco_unit_centavos: i.preco_unit_centavos, usadas: i.usadas,
      }))} />

      <label className="block">
        <span className={rotulo}>Válido até</span>
        <input type="date" name="validade" required defaultValue={p.validade_ate} className={campo} />
      </label>

      <label className="block">
        <span className={rotulo}>Regra de cancelamento deste pacote</span>
        <textarea name="regra" required rows={3} maxLength={500} defaultValue={p.regra_cancelamento} className={`${campo} py-3`} />
      </label>

      <Enviar className={`${btnPrimario} w-full`}>Salvar e reenviar resumo</Enviar>
    </form>
  );
}
