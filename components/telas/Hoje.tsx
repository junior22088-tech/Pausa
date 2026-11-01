import Link from 'next/link';
import { AlertCircle, CalendarPlus, Check, CircleDollarSign, Hourglass, MessageCircle, Plus, Settings2 } from 'lucide-react';
import { Aviso, Chip, Fab, Secao, Vazio, btnPequeno, btnPrimario, btnSecundario } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export type PendenciaHoje = { id: string; tipo: 'aceite' | 'pacote' | 'avulsa'; nome: string; valor?: string; href: string };
export type SessaoHoje = {
  id: string; hora: string; nome: string; situacao: 'marcada' | 'feita';
  tipo: 'pacote' | 'avulsa'; lembreteAberto: boolean; whatsappHref: string;
};

const PEND = {
  aceite: { icone: Hourglass, texto: 'Aguardando aceite', cor: 'bg-amber-100 text-amber-800' },
  pacote: { icone: CircleDollarSign, texto: 'Pacote não pago', cor: 'bg-red-100 text-red-800' },
  avulsa: { icone: CircleDollarSign, texto: 'Sessão avulsa não paga', cor: 'bg-red-100 text-red-800' },
};

export function TelaHoje({
  dataExtenso, hojeISO, configurado, erro, pendencias, sessoes, sessaoFeita, registrarLembrete,
}: {
  dataExtenso: string; hojeISO: string; configurado: boolean; erro?: string;
  pendencias: PendenciaHoje[]; sessoes: SessaoHoje[];
  sessaoFeita: (fd: FormData) => Promise<void>;
  registrarLembrete: (sessaoId: string) => () => Promise<void>;
}) {
  const feitas = sessoes.filter((s) => s.situacao === 'feita').length;
  return (
    <div className="space-y-6 pb-16">
      <header>
        <p className="text-[0.85rem] font-semibold text-stone-500 first-letter:uppercase">{dataExtenso}</p>
        <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight">Hoje</h1>
        {sessoes.length > 0 && (
          <p className="mt-1 text-[0.9rem] text-stone-600">
            {sessoes.length} {sessoes.length === 1 ? 'sessão' : 'sessões'} · {feitas} {feitas === 1 ? 'feita' : 'feitas'}
          </p>
        )}
      </header>

      <Aviso erro={erro} />

      {!configurado && (
        <Link href="/ajustes" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-[0.9rem] text-amber-950 ring-1 ring-amber-200">
          <Settings2 className="size-5 shrink-0" aria-hidden />
          <span>Antes de enviar mensagens, diga como seu nome aparece para os clientes. <b className="underline">Abrir Ajustes</b></span>
        </Link>
      )}

      {pendencias.length > 0 && (
        <Secao titulo={`Precisa de atenção · ${pendencias.length}`}>
          <ul className="space-y-2">
            {pendencias.map((p) => {
              const { icone: Icone, texto, cor } = PEND[p.tipo];
              return (
                <li key={`${p.tipo}-${p.id}`}>
                  <Link href={p.href} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-stone-200/80 hover:bg-stone-50">
                    <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${cor}`}><Icone className="size-[1.1rem]" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold">{p.nome}</span>
                      <span className="block text-[0.8rem] text-stone-500">{texto}{p.valor ? ` · ${p.valor}` : ''}</span>
                    </span>
                    <span className="text-[0.85rem] font-semibold text-emerald-800">{p.tipo === 'aceite' ? 'Ver' : 'Recebi'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Secao>
      )}

      <Secao titulo="Sessões de hoje">
        {sessoes.length === 0 ? (
          <Vazio
            icone={<CalendarPlus className="size-6" aria-hidden />}
            titulo="Nenhuma sessão hoje"
            texto="As sessões marcadas para hoje aparecem aqui."
            acao={<Link href={`/agenda/nova?dia=${hojeISO}`} className={btnPrimario}><Plus className="size-5" aria-hidden />Marcar sessão</Link>}
          />
        ) : (
          <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[1.65rem] before:top-4 before:w-px before:bg-stone-200">
            {sessoes.map((s) => (
              <li key={s.id} className="relative flex gap-3">
                <div className="z-[1] flex w-14 shrink-0 flex-col items-center pt-3">
                  <span className={`rounded-full px-1.5 text-[0.9rem] font-bold tabular-nums ${s.situacao === 'feita' ? 'bg-stone-50 text-stone-400' : 'bg-stone-50 text-stone-900'}`}>{s.hora}</span>
                </div>
                <div className={`min-w-0 flex-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80 ${s.situacao === 'feita' ? 'opacity-75' : ''}`}>
                  <Link href={`/sessoes/${s.id}`} className="block">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-base font-semibold">{s.nome}</span>
                      {s.situacao === 'feita'
                        ? <Chip tom="verde"><Check className="size-3.5" aria-hidden />Feita</Chip>
                        : <Chip>{s.tipo === 'pacote' ? 'Pacote' : 'Avulsa'}</Chip>}
                    </span>
                    {s.lembreteAberto && s.situacao !== 'feita' && (
                      <span className="mt-0.5 flex items-center gap-1 text-[0.8rem] text-stone-500"><MessageCircle className="size-3.5" aria-hidden />Lembrete aberto no WhatsApp</span>
                    )}
                  </Link>
                  {s.situacao === 'marcada' && (
                    <div className="mt-3 flex gap-2">
                      <form action={sessaoFeita} className="flex-1">
                        <input type="hidden" name="id" value={s.id} />
                        <Enviar className={`${btnPrimario} ${btnPequeno} w-full`}><Check className="size-4" aria-hidden />Feita</Enviar>
                      </form>
                      {!s.lembreteAberto && (
                        <WhatsAppButton className={`${btnSecundario} ${btnPequeno} flex-1`} href={s.whatsappHref} registrar={registrarLembrete(s.id)}>
                          <MessageCircle className="size-4" aria-hidden />Lembrar
                        </WhatsAppButton>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Secao>

      {pendencias.length === 0 && sessoes.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[0.85rem] text-stone-500"><AlertCircle className="size-4" aria-hidden />Nenhuma pendência de aceite ou pagamento.</p>
      )}

      <Fab href={`/agenda/nova?dia=${hojeISO}`} rotulo="Marcar" icone={<Plus className="size-5" aria-hidden />} />
    </div>
  );
}
