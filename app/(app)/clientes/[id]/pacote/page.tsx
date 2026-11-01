import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { criarPacote } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { ItensPacote } from '@/components/ItensPacote';

const opcao = 'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-stone-300 text-lg font-semibold has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50';

export default async function NovoPacote({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { prof, supabase } = await carregarProfissional();
  const [{ data: cliente }, { data: servicos }] = await Promise.all([
    supabase.from('clientes').select('nome').eq('id', id).maybeSingle(),
    supabase.from('servicos').select('id, nome, duracao_min, preco_centavos').eq('ativo', true).order('nome'),
  ]);
  if (!cliente) notFound();
  return (
    <form action={criarPacote} className="space-y-6 pb-8">
      <Titulo voltar={`/clientes/${id}`} voltarRotulo={cliente.nome}>Novo pacote</Titulo>
      <Aviso erro={erro} />
      <input type="hidden" name="cliente_id" value={id} />

      <ItensPacote servicos={servicos ?? []} iniciais={[]} valorInicial={null} />

      <fieldset className="group">
        <legend className={rotulo}>Validade a partir de hoje</legend>
        <div className="flex gap-2">
          {['60', '90', 'outro'].map((v) => (
            <label key={v} className={opcao}><input type="radio" name="validade_dias" value={v} defaultChecked={v === '90'} className="sr-only" />{v === 'outro' ? 'Outra' : `${v} dias`}</label>
          ))}
        </div>
        <label className="mt-3 hidden group-has-[input[value=outro]:checked]:block">
          <span className={rotulo}>Quantos dias?</span>
          <input name="validade_outro" inputMode="numeric" pattern="[0-9]*" placeholder="Ex.: 120" className={campo} />
        </label>
      </fieldset>

      <label className="block">
        <span className={rotulo}>Regra de cancelamento deste pacote</span>
        <textarea name="regra" required rows={3} maxLength={500} defaultValue={prof.regra_cancelamento} className={`${campo} py-3`} />
        <span className="mt-1 block text-[0.8rem] text-stone-500">O texto padrão fica em Ajustes; aqui muda só neste pacote.</span>
      </label>

      <Enviar className={`${btnPrimario} w-full`}>Salvar e preparar resumo</Enviar>
    </form>
  );
}
