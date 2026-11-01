import Link from 'next/link';
import { carregarProfissional } from '@/lib/dados';
import { diaSP } from '@/lib/format';
import { marcarSessao } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';

export default async function NovaSessao({ searchParams }: { searchParams: Promise<{ dia?: string; cliente?: string; erro?: string }> }) {
  const { dia, cliente, erro } = await searchParams;
  const { supabase } = await carregarProfissional();
  const { data: clientes } = await supabase.from('clientes').select('id, nome').order('nome');

  if (!clientes?.length) {
    return (
      <div>
        <Titulo voltar="/agenda">Marcar sessão</Titulo>
        <p className="mb-4 text-lg">Cadastre um cliente antes de marcar a sessão.</p>
        <Link href="/clientes/novo" className={btnPrimario}>Cadastrar primeiro cliente</Link>
      </div>
    );
  }

  return (
    <form action={marcarSessao} className="space-y-4">
      <Titulo voltar="/agenda">Marcar sessão</Titulo>
      <Aviso erro={erro} />
      <label className="block">
        <span className={rotulo}>Cliente</span>
        <select name="cliente_id" defaultValue={cliente ?? ''} className={campo} required>
          <option value="" disabled>Escolha</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={rotulo}>Dia</span>
          <input type="date" name="dia" defaultValue={dia ?? diaSP()} className={campo} required />
        </label>
        <label className="block">
          <span className={rotulo}>Horário</span>
          <input type="time" name="hora" step={900} className={campo} required />
        </label>
      </div>
      <label className="block">
        <span className={rotulo}>Valor, se for sessão avulsa (opcional)</span>
        <input name="valor" inputMode="decimal" placeholder="R$ 120,00" className={campo} />
        <span className="mt-1 block text-base text-stone-500">Se o cliente tem pacote ativo, a sessão entra no pacote.</span>
      </label>
      <button className={`${btnPrimario} w-full`}>Marcar</button>
    </form>
  );
}
