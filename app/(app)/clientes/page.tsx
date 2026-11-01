import Link from 'next/link';
import { carregarProfissional } from '@/lib/dados';
import { telefoneBonito } from '@/lib/format';
import { Titulo, btnPrimario, campo } from '@/components/ui';

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase } = await carregarProfissional();
  let query = supabase.from('clientes').select('id, nome, telefone').order('nome');
  if (q) query = query.ilike('nome', `%${q.replace(/[%_]/g, '')}%`);
  const { data: clientes } = await query;

  return (
    <div className="space-y-4">
      <Titulo>Clientes</Titulo>
      <Link href="/clientes/novo" className={`${btnPrimario} w-full`}>Novo cliente</Link>
      <form>
        <input name="q" defaultValue={q} placeholder="Buscar pelo nome" className={campo} aria-label="Buscar cliente" />
      </form>
      {!clientes?.length && <p className="text-lg text-stone-600">{q ? 'Ninguém com esse nome.' : 'Nenhum cliente ainda.'}</p>}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {clientes?.map((c) => (
          <li key={c.id}>
            <Link href={`/clientes/${c.id}`} className="flex min-h-14 flex-col justify-center px-4 py-2">
              <span className="text-lg font-semibold">{c.nome}</span>
              <span className="text-base text-stone-500">{telefoneBonito(c.telefone)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
