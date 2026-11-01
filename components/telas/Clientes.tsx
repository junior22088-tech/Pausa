import Link from 'next/link';
import { CalendarClock, Search, UserPlus, Users } from 'lucide-react';
import { Avatar, Chip, Fab, Lista, LinhaLista, Titulo, Vazio, btnPrimario } from '@/components/ui';

export type ClienteResumo = {
  id: string; nome: string; telefone: string;
  pacote: { saldo: number; total: number; aguardandoAceite: boolean; pago: boolean } | null;
  proxima: string | null; // "ter, 3 nov · 15:00"
};

function subtitulo(c: ClienteResumo) {
  if (!c.proxima) return c.telefone;
  return (
    <span className="inline-flex items-center gap-1">
      <CalendarClock className="size-3.5 shrink-0" aria-label="Próxima sessão" />{c.proxima}
    </span>
  );
}

function etiqueta(c: ClienteResumo) {
  if (!c.pacote) return null;
  if (c.pacote.aguardandoAceite) return <Chip tom="ambar">Aceite</Chip>;
  if (c.pacote.saldo === 0) return <Chip tom="vermelho">0/{c.pacote.total}</Chip>;
  return <Chip tom={c.pacote.saldo <= 2 ? 'ambar' : 'verde'}>{c.pacote.saldo}/{c.pacote.total}</Chip>;
}

export function TelaClientes({ q, clientes }: { q?: string; clientes: ClienteResumo[] }) {
  return (
    <div className="space-y-4 pb-16">
      <Titulo>Clientes</Titulo>
      <form role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
        <input
          name="q" defaultValue={q} type="search" placeholder="Buscar pelo nome" aria-label="Buscar cliente"
          className="block min-h-12 w-full rounded-full border-0 bg-white pl-12 pr-4 text-base shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
        />
      </form>

      {clientes.length > 0 && (
        <p className="text-[0.8rem] text-stone-500">
          {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}{q ? ` com “${q}”` : ''} · etiqueta = sessões restantes no pacote
        </p>
      )}

      {clientes.length === 0 ? (
        q ? (
          <Vazio icone={<Search className="size-6" aria-hidden />} titulo={`Ninguém com “${q}”`} texto="Confira a grafia ou cadastre um cliente novo."
            acao={<Link href="/clientes/novo" className={btnPrimario}><UserPlus className="size-5" aria-hidden />Novo cliente</Link>} />
        ) : (
          <Vazio icone={<Users className="size-6" aria-hidden />} titulo="Nenhum cliente ainda" texto="Cadastre com nome e WhatsApp. Leva 20 segundos."
            acao={<Link href="/clientes/novo" className={btnPrimario}><UserPlus className="size-5" aria-hidden />Cadastrar o primeiro</Link>} />
        )
      ) : (
        <Lista>
          {clientes.map((c) => (
            <LinhaLista key={c.id} href={`/clientes/${c.id}`} inicio={<Avatar nome={c.nome} />} titulo={c.nome} subtitulo={subtitulo(c)} fim={etiqueta(c)} />
          ))}
        </Lista>
      )}

      {clientes.length > 0 && <Fab href="/clientes/novo" rotulo="Cliente" icone={<UserPlus className="size-5" aria-hidden />} />}
    </div>
  );
}
