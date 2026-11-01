import Link from 'next/link';
import { CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, MessageCircle, RotateCcw, XCircle } from 'lucide-react';
import { Avatar, Aviso, Chip, btnPequeno, btnPerigo, btnPrimario, btnSecundario, btnTexto, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export type SessaoDados = {
  id: string;
  cliente: { id: string; nome: string };
  hora: string; diaExtenso: string; diaISO: string;
  situacao: 'marcada' | 'feita' | 'cancelada';
  descontada: boolean; temPacote: boolean; saldoPacote: number | null;
  valorAvulso: string | null; pago: boolean;
  lembreteAberto: boolean; whatsappHref: string;
  servico?: string | null; fim?: string | null;
  /** A sessão cai numa folga/bloqueio: texto do motivo e link do aviso no WhatsApp. */
  folga?: { texto: string; avisoHref: string } | null;
};

type Acao = (fd: FormData) => Promise<void>;

/** Linha de "Outras ações": fechada mostra só o nome; aberta mostra o formulário. */
function OutraAcao({ icone, titulo, descricao, perigo = false, children }: { icone: React.ReactNode; titulo: string; descricao: string; perigo?: boolean; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-stone-50">
        <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${perigo ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-600'}`}>{icone}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-base font-semibold ${perigo ? 'text-red-800' : 'text-stone-900'}`}>{titulo}</span>
          <span className="block text-[0.8rem] text-stone-500">{descricao}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export function TelaSessao({
  s, erro, sessaoFeita, desfazerFeita, cancelarSessao, registrarLembrete, registrarAvisoFolga,
}: {
  s: SessaoDados; erro?: string;
  sessaoFeita: Acao; desfazerFeita: Acao; remarcarSessao?: Acao; cancelarSessao: Acao;
  registrarLembrete: () => Promise<void>; registrarAvisoFolga?: () => Promise<void>;
}) {
  const estado = s.situacao === 'feita'
    ? <Chip tom="verde"><Check className="size-3.5" aria-hidden />Feita</Chip>
    : s.situacao === 'cancelada' ? <Chip tom="vermelho">Cancelada{s.descontada ? ' · descontada' : ''}</Chip>
    : <Chip tom="ambar">Marcada</Chip>;

  return (
    <div className="space-y-5 pb-8">
      <div className="-ml-2 flex min-h-11 items-center">
        <Link href={`/agenda?dia=${s.diaISO}`} className={btnTexto}><ChevronLeft className="size-5" aria-hidden />Agenda</Link>
      </div>

      <Aviso erro={erro} />

      {/* Resumo da sessão */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80">
        <Link href={`/clientes/${s.cliente.id}`} className="flex items-center gap-3">
          <Avatar nome={s.cliente.nome} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{s.cliente.nome}</span>
            <span className="block text-[0.8rem] text-emerald-800">Ver ficha</span>
          </span>
        </Link>
        <div className="mt-4 border-t border-stone-100 pt-4">
          <h1 className="text-[2rem] font-bold leading-none tracking-tight tabular-nums">{s.hora}{s.fim && <span className="text-[1.1rem] font-semibold text-stone-400"> às {s.fim}</span>}</h1>
          <p className="mt-1 text-base text-stone-600 first-letter:uppercase">{s.diaExtenso}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {estado}
            {s.servico && <Chip>{s.servico}</Chip>}
            <Chip>{s.temPacote ? 'Pacote' : `Avulsa${s.valorAvulso ? ` · ${s.valorAvulso}` : ''}`}</Chip>
            {!s.temPacote && s.situacao === 'feita' && (s.pago ? <Chip tom="verde">Paga</Chip> : <Chip tom="vermelho">Não paga</Chip>)}
            {s.lembreteAberto && s.situacao === 'marcada' && <Chip><MessageCircle className="size-3.5" aria-hidden />Lembrete enviado</Chip>}
          </div>
        </div>
      </section>

      {s.folga && s.situacao === 'marcada' && (
        <div role="alert" className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <p className="text-[0.9rem] font-semibold text-amber-950">Esta sessão cai numa folga: {s.folga.texto}.</p>
          <p className="mb-2 text-[0.85rem] text-amber-900">Avise o cliente e remarque.</p>
          <div className="flex gap-2">
            {registrarAvisoFolga && (
              <WhatsAppButton className={`${btnSecundario} ${btnPequeno} flex-1`} href={s.folga.avisoHref} registrar={registrarAvisoFolga}>
                <MessageCircle className="size-4" aria-hidden />Avisar
              </WhatsAppButton>
            )}
            <Link href={`/sessoes/${s.id}/remarcar`} className={`${btnPrimario} ${btnPequeno} flex-1`}>Remarcar</Link>
          </div>
        </div>
      )}

      {/* Ação principal */}
      {s.situacao === 'marcada' && (
        <div className="space-y-2">
          <form action={sessaoFeita}>
            <input type="hidden" name="id" value={s.id} />
            <Enviar className={`${btnPrimario} w-full`}><Check className="size-5" aria-hidden />Marcar como feita</Enviar>
          </form>
          <p className="text-center text-[0.8rem] text-stone-500">
            {s.temPacote ? `Desconta 1 sessão do pacote${s.saldoPacote !== null ? ` (${s.saldoPacote === 1 ? 'resta' : 'restam'} ${s.saldoPacote})` : ''}.` : 'Sessão avulsa: depois você registra o pagamento.'}
          </p>
          <WhatsAppButton className={`${btnSecundario} w-full`} href={s.whatsappHref} registrar={registrarLembrete}>
            <MessageCircle className="size-5" aria-hidden />{s.lembreteAberto ? 'Lembrar de novo' : 'Lembrar no WhatsApp'}
          </WhatsAppButton>
        </div>
      )}

      {s.situacao === 'feita' && !s.temPacote && !s.pago && (
        <Link href={`/pagamento?sessao=${s.id}`} className={`${btnPrimario} w-full`}><CircleDollarSign className="size-5" aria-hidden />Registrar pagamento</Link>
      )}

      {/* Outras ações: fechadas por padrão, para não serem tocadas sem querer */}
      {s.situacao !== 'cancelada' && (
        <section className="space-y-2">
          <h2 className="text-[0.8rem] font-bold uppercase tracking-wider text-stone-500">Outras ações</h2>
          <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
            {s.situacao === 'marcada' && (
              <>
                <Link href={`/sessoes/${s.id}/remarcar`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600"><CalendarClock className="size-[1.1rem]" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-stone-900">Remarcar</span>
                    <span className="block text-[0.8rem] text-stone-500">Escolher outro horário livre</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
                </Link>
                <OutraAcao perigo icone={<XCircle className="size-[1.1rem]" aria-hidden />} titulo="Cancelar sessão" descricao="Sai da agenda; fica no histórico">
                  <form action={cancelarSessao} className="space-y-3">
                    <input type="hidden" name="id" value={s.id} />
                    {s.temPacote && (
                      <fieldset className="space-y-1">
                        <legend className={rotulo}>Descontar do pacote?</legend>
                        <label className="flex min-h-12 items-center gap-3 text-base"><input type="radio" name="desconta" value="nao" defaultChecked className="size-5 accent-emerald-700" />Não, avisou no prazo</label>
                        <label className="flex min-h-12 items-center gap-3 text-base"><input type="radio" name="desconta" value="sim" className="size-5 accent-emerald-700" />Sim, conforme a regra</label>
                      </fieldset>
                    )}
                    <Enviar className={`${btnPerigo} w-full`}>Confirmar cancelamento</Enviar>
                  </form>
                </OutraAcao>
              </>
            )}
            {s.situacao === 'feita' && (
              <OutraAcao perigo icone={<RotateCcw className="size-[1.1rem]" aria-hidden />} titulo="Não foi feita" descricao="Corrige o registro e devolve o saldo">
                <form action={desfazerFeita}>
                  <input type="hidden" name="id" value={s.id} />
                  <p className="mb-3 text-[0.9rem] text-stone-600">A sessão volta para marcada{s.temPacote ? ' e a sessão volta para o saldo do pacote' : ''}. A correção fica no histórico.</p>
                  <Enviar className={`${btnPerigo} w-full`}>Confirmar correção</Enviar>
                </form>
              </OutraAcao>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
