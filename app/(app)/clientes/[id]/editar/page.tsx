import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { telefoneBonito } from '@/lib/format';
import { corrigirCliente } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';

export default async function EditarCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await carregarProfissional();
  const { data: c } = await supabase.from('clientes').select('id, nome, telefone').eq('id', id).maybeSingle();
  if (!c) notFound();
  return (
    <form action={corrigirCliente} className="space-y-4">
      <Titulo voltar={`/clientes/${id}`}>Corrigir cliente</Titulo>
      <Aviso erro={erro} />
      <input type="hidden" name="id" value={c.id} />
      <label className="block"><span className={rotulo}>Nome</span><input name="nome" defaultValue={c.nome} required className={campo} /></label>
      <label className="block"><span className={rotulo}>WhatsApp com DDD</span><input name="telefone" defaultValue={telefoneBonito(c.telefone)} required inputMode="tel" className={campo} /></label>
      <button className={`${btnPrimario} w-full`}>Salvar correção</button>
    </form>
  );
}
