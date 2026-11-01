import { carregarProfissional } from '@/lib/dados';
import { criarPacote } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

const opcao = 'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-stone-300 text-lg font-semibold has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50';

export default async function NovoPacote({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { prof } = await carregarProfissional();
  return (
    <form action={criarPacote} className="space-y-5">
      <Titulo voltar={`/clientes/${id}`}>Novo pacote</Titulo>
      <Aviso erro={erro} />
      <input type="hidden" name="cliente_id" value={id} />
      <fieldset className="group">
        <legend className={rotulo}>Sessões</legend>
        <div className="flex gap-2">
          {['5', '10', 'outro'].map((v) => (
            <label key={v} className={opcao}><input type="radio" name="total_sessoes" value={v} defaultChecked={v === '10'} className="sr-only" />{v === 'outro' ? 'Outro' : v}</label>
          ))}
        </div>
        <label className="mt-3 hidden group-has-[input[value=outro]:checked]:block">
          <span className={rotulo}>Quantas sessões?</span>
          <input name="total_outro" inputMode="numeric" pattern="[0-9]*" placeholder="Ex.: 29" className={campo} />
        </label>
      </fieldset>
      <label className="block">
        <span className={rotulo}>Valor do pacote</span>
        <input name="valor" required inputMode="decimal" placeholder="R$ 900,00" className={campo} />
      </label>
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
      <p className="text-base text-stone-600">Regra de cancelamento: {prof.regra_cancelamento} <a href="/ajustes" className="underline">mudar</a></p>
      <Enviar className={`${btnPrimario} w-full`}>Salvar e preparar resumo</Enviar>
    </form>
  );
}
