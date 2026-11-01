import Link from 'next/link';
import { AlertTriangle, CalendarOff, CalendarPlus, MessageCircle, Plus } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { configAgenda } from '@/lib/agenda-dados';
import { hhmm, minutosSP, type Bloqueio } from '@/lib/agenda-horarios';
import { dataPorExtenso, diaSP, hora, inicioDoDia, linkWhatsApp, msgRemarcarPorFolga, somarDias } from '@/lib/format';
import { criarBloqueio, registrarWhatsApp, removerBloqueio } from '@/lib/actions';
import { Aviso, Cartao, Chip, Titulo, Vazio, btnPequeno, btnPerigo, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { SeletorHora } from '@/components/SeletorHora';
import { WhatsAppButton } from '@/components/WhatsAppButton';

const ddmm = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

export function TelaFolgas({ futuros, afetadasPor, prof, hoje, mostrarForm, nova, ver, erro }: { futuros: Bloqueio[]; afetadasPor: (b: any) => any[]; prof: any; hoje: string; mostrarForm: boolean; nova?: string; ver?: string; erro?: string }) {
  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar="/ajustes" voltarRotulo="Ajustes">Folgas e bloqueios</Titulo>
      <p className="-mt-2 text-[0.9rem] text-stone-600">Dias ou horários em que você não atende. Eles somem dos horários livres. Sessões já marcadas não são canceladas: o Pausa mostra quais são para você avisar e remarcar.</p>
      <Aviso erro={erro} />

      {futuros.length === 0 && !nova && <Vazio icone={<CalendarOff className="size-6" aria-hidden />} titulo="Nenhuma folga marcada" />}

      <ul className="space-y-3">
        {futuros.map((b) => {
          const lista = afetadasPor(b);
          return (
            <li key={b.id}>
              <Cartao className={b.id === ver ? 'ring-2 ring-emerald-600' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{b.data_inicio === b.data_fim ? <span className="first-letter:uppercase">{dataPorExtenso(b.data_inicio)}</span> : `${ddmm(b.data_inicio)} a ${ddmm(b.data_fim)}`}</p>
                    <p className="text-[0.85rem] text-stone-500">{b.dia_inteiro ? 'Dia inteiro' : `${hhmm(b.inicio_min!)} às ${hhmm(b.fim_min!)}`}{b.motivo ? ` · ${b.motivo}` : ''}</p>
                  </div>
                  {lista.length > 0 ? <Chip tom="ambar"><AlertTriangle className="size-3.5" aria-hidden />{lista.length} {lista.length === 1 ? 'sessão' : 'sessões'}</Chip> : <Chip tom="verde">Sem sessões</Chip>}
                </div>

                {lista.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3">
                    <p className="mb-2 text-[0.85rem] font-semibold text-amber-950">Avise e remarque {lista.length === 1 ? 'esta sessão' : 'estas sessões'}:</p>
                    <ul className="space-y-2">
                      {lista.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-amber-200">
                          <Link href={`/sessoes/${s.id}`} className="min-w-0 flex-1 px-1">
                            <span className="block truncate text-[0.95rem] font-semibold">{s.clientes?.nome}</span>
                            <span className="block text-[0.8rem] text-stone-500">{ddmm(diaSP(new Date(s.inicio)))} às {hora(s.inicio)} · <span className="text-emerald-800 underline">remarcar</span></span>
                          </Link>
                          <WhatsAppButton
                            className={`${btnSecundario} ${btnPequeno} shrink-0`}
                            href={linkWhatsApp(s.clientes?.telefone ?? '', msgRemarcarPorFolga(prof, s.clientes?.nome ?? '', s.inicio))}
                            registrar={registrarWhatsApp.bind(null, s.id, 'aviso_folga')}
                          >
                            <MessageCircle className="size-4" aria-hidden />Avisar
                          </WhatsAppButton>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <details className="mt-3">
                  <summary className="inline-flex min-h-10 cursor-pointer list-none items-center text-[0.85rem] font-semibold text-red-800">Remover folga…</summary>
                  <form action={removerBloqueio} className="mt-2 rounded-xl bg-red-50 p-3">
                    <input type="hidden" name="id" value={b.id} />
                    <p className="mb-2 text-[0.85rem] text-red-900">Os horários desse período voltam a ficar livres.</p>
                    <Enviar className={`${btnPerigo} ${btnPequeno} w-full`}>Sim, remover</Enviar>
                  </form>
                </details>
              </Cartao>
            </li>
          );
        })}
      </ul>

      {mostrarForm ? (
        <Cartao>
          <h2 className="mb-3 text-base font-bold">Nova folga ou bloqueio</h2>
          <form action={criarBloqueio} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label><span className={rotulo}>De</span><input type="date" name="data_inicio" required min={hoje} defaultValue={hoje} className={campo} /></label>
              <label><span className={rotulo}>Até (opcional)</span><input type="date" name="data_fim" min={hoje} className={campo} /></label>
            </div>
            <fieldset className="group/tipo space-y-1">
              <legend className={rotulo}>Quanto do dia?</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base"><input type="radio" name="dia_inteiro" value="sim" defaultChecked className="size-5 accent-emerald-700" />Dia inteiro</label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base"><input type="radio" name="dia_inteiro" value="nao" className="trecho size-5 accent-emerald-700" />Só um horário</label>
              <div className="hidden grid-cols-2 gap-3 pt-1 group-has-[.trecho:checked]/tipo:grid">
                <label><span className={rotulo}>Das</span><SeletorHora nome="inicio" valor={840} de={360} ate={1320} rotulo="Início do bloqueio" /></label>
                <label><span className={rotulo}>Às</span><SeletorHora nome="fim" valor={960} de={360} ate={1320} rotulo="Fim do bloqueio" /></label>
              </div>
            </fieldset>
            <label className="block"><span className={rotulo}>Motivo (só você vê, opcional)</span><input name="motivo" maxLength={120} placeholder="Ex.: Férias, dentista, curso" className={campo} /></label>
            <div className="flex gap-2">
              {futuros.length > 0 && <Link href="/ajustes/folgas" className={`${btnSecundario} flex-1`}>Voltar</Link>}
              <Enviar className={`${btnPrimario} flex-1`}><CalendarPlus className="size-5" aria-hidden />Registrar folga</Enviar>
            </div>
          </form>
        </Cartao>
      ) : (
        <Link href="/ajustes/folgas?nova=1" className={`${btnPrimario} w-full`}><Plus className="size-5" aria-hidden />Nova folga ou bloqueio</Link>
      )}
    </div>
  );
}
