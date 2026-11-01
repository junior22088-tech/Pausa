import Link from 'next/link';
import { CalendarClock, ChevronLeft, CalendarPlus, CircleDollarSign, History, MessageCircle, Package, Pencil, Plus } from 'lucide-react';
import {
  AcaoRapida, Abas, Avatar, Aviso, Cartao, Chip, Lista, LinhaLista, Progresso, Secao, Vazio,
  btnPequeno, btnPerigo, btnPrimario, btnSecundario, btnTexto,
} from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export type PacoteFicha = {
  id: string; total: number; usadas: number; saldo: number; valor: string; validade: string;
  situacao: 'aguardando_aceite' | 'aceito'; pago: boolean;
};
export type FichaDados = {
  cliente: { id: string; nome: string; telefone: string; telefoneBonito: string };
  whatsappHref: string;
  pacote: PacoteFicha | null;
  proximas: { id: string; dia: string; hora: string }[];
  pagamentos: { id: string; data: string; valor: string; forma: string; anulado: boolean }[];
  eventos: { id: number | string; data: string; hora: string; descricao: string }[];
};

export function TelaFichaCliente({
  dados, aba, ok, anularPagamento,
}: { dados: FichaDados; aba: string; ok?: string; anularPagamento: (fd: FormData) => Promise<void> }) {
  const { cliente: c, pacote: p } = dados;
  const base = `/clientes/${c.id}`;
  const abaAtiva = ['sessoes', 'pagamentos', 'historico'].includes(aba) ? aba : 'sessoes';

  return (
    <div className="space-y-5 pb-8">
      <div className="-ml-2 -mr-2 flex min-h-11 items-center justify-between">
        <Link href="/clientes" className={btnTexto}><ChevronLeft className="size-5" aria-hidden />Clientes</Link>
        <Link href={`${base}/editar`} className={btnTexto}><Pencil className="size-4" aria-hidden />Editar</Link>
      </div>

      {/* Cabeçalho de contato */}
      <header className="flex flex-col items-center text-center">
        <Avatar nome={c.nome} grande />
        <h1 className="mt-3 text-[1.5rem] font-bold leading-tight tracking-tight">{c.nome}</h1>
        <p className="text-[0.9rem] text-stone-500">{c.telefoneBonito}</p>
      </header>

      <nav aria-label="Ações rápidas" className="flex justify-center gap-2">
        <AcaoRapida href={dados.whatsappHref} externo icone={<MessageCircle className="size-5" aria-hidden />} rotulo="WhatsApp" />
        <AcaoRapida href={`/agenda/nova?cliente=${c.id}`} icone={<CalendarPlus className="size-5" aria-hidden />} rotulo="Marcar" />
        <AcaoRapida href={`${base}/pacote`} icone={<Package className="size-5" aria-hidden />} rotulo="Novo pacote" />
      </nav>

      {ok === 'novo' && <Aviso ok={<>Cliente salvo. Próximo passo: <Link href={`${base}/pacote`} className="font-semibold underline">criar um pacote</Link> ou <Link href={`/agenda/nova?cliente=${c.id}`} className="font-semibold underline">marcar uma sessão avulsa</Link>.</>} />}
      {ok === 'aceite' && <Aviso ok={<>Aceite registrado. Próximo passo: <Link href={`/agenda/nova?cliente=${c.id}`} className="font-semibold underline">marcar a primeira sessão</Link>.</>} />}

      {/* Pacote */}
      <Secao titulo="Pacote">
        {p ? (
          <Cartao>
            <div className="flex flex-wrap gap-1.5">
              {p.situacao === 'aguardando_aceite' ? <Chip tom="ambar">Aguardando aceite</Chip> : <Chip tom="verde">Aceito</Chip>}
              {p.pago ? <Chip tom="verde">Pago</Chip> : <Chip tom="vermelho">Não pago</Chip>}
            </div>
            <p className="mt-2 text-[1.6rem] font-bold leading-tight">
              {p.saldo} <span className="text-base font-semibold text-stone-500">{p.saldo === 1 ? 'sessão restante' : 'sessões restantes'}</span>
            </p>
            <p className="text-[0.85rem] text-stone-500">Pacote de {p.total} · {p.valor}</p>
            <div className="mt-3"><Progresso usadas={p.usadas} total={p.total} /></div>
            <p className="mt-1.5 text-[0.8rem] text-stone-500">{p.usadas} de {p.total} usadas · vale até {p.validade}</p>
            <div className="mt-4 flex gap-2">
              <Link href={`/pacotes/${p.id}/resumo`} className={`${p.situacao === 'aguardando_aceite' ? btnPrimario : btnSecundario} ${btnPequeno} flex-1`}>
                {p.situacao === 'aguardando_aceite' ? 'Marcar aceite' : 'Ver resumo'}
              </Link>
              {!p.pago && (
                <Link href={`/pagamento?pacote=${p.id}`} className={`${btnSecundario} ${btnPequeno} flex-1`}>
                  <CircleDollarSign className="size-4" aria-hidden />Recebi
                </Link>
              )}
            </div>
          </Cartao>
        ) : (
          <Vazio icone={<Package className="size-6" aria-hidden />} titulo="Sem pacote ativo" texto="Sessões marcadas agora entram como avulsas."
            acao={<Link href={`${base}/pacote`} className={btnPrimario}><Plus className="size-5" aria-hidden />Criar pacote</Link>} />
        )}
      </Secao>

      {/* Abas */}
      <Abas
        ativa={abaAtiva}
        itens={[
          { id: 'sessoes', rotulo: 'Sessões', href: `${base}?aba=sessoes`, contagem: dados.proximas.length },
          { id: 'pagamentos', rotulo: 'Pagamentos', href: `${base}?aba=pagamentos` },
          { id: 'historico', rotulo: 'Histórico', href: `${base}?aba=historico` },
        ]}
      />

      {abaAtiva === 'sessoes' && (
        dados.proximas.length ? (
          <Lista>
            {dados.proximas.map((s) => (
              <LinhaLista key={s.id} href={`/sessoes/${s.id}`}
                inicio={<span className="inline-flex size-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><CalendarClock className="size-5" aria-hidden /></span>}
                titulo={<span className="block first-letter:uppercase">{s.dia}</span>} subtitulo={s.hora} />
            ))}
          </Lista>
        ) : (
          <Vazio icone={<CalendarPlus className="size-6" aria-hidden />} titulo="Nenhuma sessão marcada"
            acao={<Link href={`/agenda/nova?cliente=${c.id}`} className={btnSecundario}><Plus className="size-5" aria-hidden />Marcar sessão</Link>} />
        )
      )}

      {abaAtiva === 'pagamentos' && (
        dados.pagamentos.length ? (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
            {dados.pagamentos.map((pg) => (
              <li key={pg.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={pg.anulado ? 'text-stone-400 line-through' : ''}>
                    <span className="block text-base font-semibold">{pg.valor}</span>
                    <span className="block text-[0.8rem] text-stone-500">{pg.data} · {pg.forma}</span>
                  </span>
                  {pg.anulado ? <Chip>Anulado</Chip> : (
                    <details className="text-right">
                      <summary className={`${btnTexto} cursor-pointer list-none text-red-800 hover:bg-red-50`}>Anular</summary>
                      <form action={anularPagamento} className="mt-2 w-60 rounded-2xl bg-red-50 p-3 text-left">
                        <input type="hidden" name="id" value={pg.id} />
                        <p className="mb-2 text-[0.85rem] text-red-900">Anular este pagamento? Ele fica riscado e o item volta a “não pago”.</p>
                        <Enviar className={`${btnPerigo} ${btnPequeno} w-full`}>Sim, anular</Enviar>
                      </form>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio icone={<CircleDollarSign className="size-6" aria-hidden />} titulo="Nenhum pagamento registrado" />
        )
      )}

      {abaAtiva === 'historico' && (
        dados.eventos.length ? (
          <Cartao>
            <p className="mb-3 text-[0.8rem] text-stone-500">Nada aqui é apagado. Correções aparecem como novos registros.</p>
            <ol className="relative space-y-4 border-l border-stone-200 pl-5">
              {dados.eventos.map((e) => (
                <li key={e.id} className="relative">
                  <span aria-hidden className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <p className="text-[0.75rem] font-semibold text-stone-500">{e.data} · {e.hora}</p>
                  <p className="text-[0.95rem]">{e.descricao}</p>
                </li>
              ))}
            </ol>
          </Cartao>
        ) : (
          <Vazio icone={<History className="size-6" aria-hidden />} titulo="Sem histórico ainda" />
        )
      )}
    </div>
  );
}
