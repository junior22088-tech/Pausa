import { Search } from 'lucide-react';

export function Busca({ valor = '', grande = false }: { valor?: string; grande?: boolean }) {
  return (
    <form action="/wiki" method="get" role="search" className="relative">
      <Search className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 ${grande ? 'size-5' : 'size-4'}`} aria-hidden />
      <input
        type="search" name="q" defaultValue={valor} placeholder="Pesquisar: pacote, remarcar, senha…" aria-label="Pesquisar na ajuda"
        className={`block w-full rounded-full border border-stone-200 bg-white pl-11 pr-4 text-base shadow-sm placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 ${grande ? 'min-h-14' : 'min-h-12'}`}
      />
    </form>
  );
}
