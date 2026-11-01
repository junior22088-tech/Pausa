import { criarCliente } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function NovoCliente({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <form action={criarCliente} className="space-y-4">
      <Titulo voltar="/clientes">Novo cliente</Titulo>
      <Aviso erro={erro} />
      <label className="block">
        <span className={rotulo}>Nome</span>
        <input name="nome" required autoComplete="off" className={campo} />
      </label>
      <label className="block">
        <span className={rotulo}>WhatsApp com DDD</span>
        <input name="telefone" required inputMode="tel" placeholder="(11) 99999-0000" className={campo} />
      </label>
      <p className="text-base text-stone-500">Não anote aqui informações de saúde. A ficha de saúde ainda não faz parte do app.</p>
      <Enviar className={`${btnPrimario} w-full`}>Salvar</Enviar>
    </form>
  );
}
