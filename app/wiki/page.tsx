import Link from 'next/link';
import { ArrowRight, ChevronRight, MessageCircle, PlayCircle, SearchX } from 'lucide-react';
import { buscar, navegacao } from '@/lib/wiki';
import { linkWhatsApp } from '@/lib/format';
import { Busca } from '@/components/ajuda/Busca';
import { IconeSecao } from '@/components/ajuda/Icone';

export default async function CentralDeAjuda({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const termo = (q ?? '').trim();
  const secoes = navegacao();
  const trilha = secoes.find((s) => s.trilha)!;
  const temas = secoes.filter((s) => !s.trilha);
  const resultados = termo ? buscar(termo) : [];
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP;

  return (
    <main>
      {/* Boas-vindas + busca */}
      <section className="bg-gradient-to-b from-emerald-800 to-emerald-700 px-4 pb-10 pt-8 text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">Olá! 👋<br />Como podemos te ajudar?</h1>
          <p className="mt-2 text-[0.95rem] text-emerald-50/90">Guias passo a passo, com as telas do app.</p>
          <div className="mt-5 text-stone-900"><Busca valor={termo} grande /></div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-8 px-4 pt-6">
        {termo ? (
          <section>
            <p className="mb-3 text-[0.9rem] text-stone-500">
              {resultados.length ? `${resultados.length} resultado${resultados.length > 1 ? 's' : ''} para “${termo}”` : `Nada encontrado para “${termo}”.`}{' '}
              <Link href="/wiki" className="font-semibold text-emerald-800 underline">Limpar</Link>
            </p>
            {resultados.length ? (
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
                {resultados.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/wiki/${r.slug}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50">
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold">{r.titulo}</span>
                        <span className="block text-[0.85rem] text-stone-500">{r.secao}{r.descricao ? ` · ${r.descricao}` : ''}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200/80">
                <SearchX className="size-8 text-stone-400" aria-hidden />
                <p className="mt-2 text-base">Tente outra palavra, como “pacote”, “horário” ou “pagamento”.</p>
              </div>
            )}
          </section>
        ) : null}

        {/* Trilha de primeiros acessos */}
        <section aria-labelledby="comece" className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-200/80">
          <div className="flex items-start gap-4 p-5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><IconeSecao nome={trilha.icone} /></span>
            <div className="min-w-0">
              <p className="text-[0.75rem] font-bold uppercase tracking-wider text-emerald-700">Comece por aqui</p>
              <h2 id="comece" className="text-[1.25rem] font-bold leading-tight">{trilha.titulo}</h2>
              <p className="mt-1 text-[0.9rem] text-stone-600">{trilha.descricao} {trilha.itens.length} aulas curtas.</p>
            </div>
          </div>
          <ol className="border-t border-stone-100">
            {trilha.itens.map((i, n) => (
              <li key={i.slug}>
                <Link href={`/wiki/${i.slug}`} className="flex min-h-14 items-center gap-3 px-5 py-2.5 hover:bg-stone-50">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[0.8rem] font-bold text-stone-700">{n + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.95rem] font-semibold leading-snug">{i.titulo}</span>
                    {i.descricao && <span className="block truncate text-[0.8rem] text-stone-500">{i.descricao}</span>}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-stone-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
          <div className="border-t border-stone-100 p-4">
            <Link href={`/wiki/${trilha.itens[0].slug}`} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800">
              <PlayCircle className="size-5" aria-hidden />Começar a trilha
            </Link>
          </div>
        </section>

        {/* Temas */}
        <section aria-labelledby="temas">
          <h2 id="temas" className="mb-3 text-[0.8rem] font-bold uppercase tracking-wider text-stone-500">Todos os temas</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {temas.map((s) => (
              <li key={s.id}>
                <Link href={`/wiki/tema/${s.id}`} className={`flex h-full items-start gap-3 rounded-2xl p-4 shadow-sm ring-1 hover:ring-emerald-600 ${s.tecnico ? 'bg-stone-100 ring-stone-200' : 'bg-white ring-stone-200/80'}`}>
                  <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${s.tecnico ? 'bg-white text-stone-600' : 'bg-emerald-50 text-emerald-800'}`}><IconeSecao nome={s.icone} className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold">{s.titulo}</span>
                    <span className="block text-[0.85rem] leading-snug text-stone-600">{s.descricao}</span>
                    <span className="mt-1.5 block text-[0.75rem] font-semibold text-stone-400">{s.itens.length} {s.itens.length === 1 ? 'artigo' : 'artigos'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Ainda com dúvida */}
        <section className="flex items-center gap-4 rounded-2xl bg-emerald-50 p-5">
          <MessageCircle className="size-8 shrink-0 text-emerald-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">Não achou o que procurava?</p>
            <p className="text-[0.85rem] text-stone-600">{suporte ? 'Fale com a gente pelo WhatsApp.' : 'Veja as perguntas frequentes.'}</p>
          </div>
          <a href={suporte ? linkWhatsApp(suporte, 'Olá! Preciso de ajuda com o Pausa.') : '/wiki/tutoriais/perguntas-frequentes'}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-white px-4 text-[0.9rem] font-semibold text-emerald-800 shadow-sm">
            {suporte ? 'Chamar' : 'Ver'}<ArrowRight className="size-4" aria-hidden />
          </a>
        </section>
      </div>
    </main>
  );
}
