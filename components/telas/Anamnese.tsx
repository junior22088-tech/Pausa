import Link from 'next/link';
import { AlertTriangle, History, Lock, LockOpen, MessageCircle, Pencil, ShieldCheck, ShieldOff } from 'lucide-react';
import type { Modelo, Respostas } from '@/lib/anamnese-modelo';
import { Aviso, Cartao, Chip, Confirmar, Secao, Titulo, btnPerigo, btnPrimario, btnSecundario, btnTexto, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { WhatsAppButton } from '@/components/WhatsAppButton';

type Acao = (fd: FormData) => Promise<void>;
export type DadosAnamnese = {
  cliente: { id: string; nome: string };
  estado: 'sem_chave' | 'sem_consentimento' | 'bloqueada' | 'aberta';
  pedidoEnviado: boolean;
  pedido?: { href: string; registrar: () => Promise<void> };
  consentimento?: { data: string; resposta: string | null };
  modelo: Modelo;
  respostas: Respostas | null;
  erroLeitura?: string;
  alertas: { rotulo: string; detalhe?: string }[];
  versoes: { versao: number; data: string }[];
  acessos: { acao: string; data: string }[];
  editar: boolean;
};

const ACAO: Record<string, string> = {
  pediu_autorizacao: 'Pedido de autorização enviado', autorizou: 'Autorização registrada', abriu: 'Ficha aberta',
  salvou: 'Ficha salva', revogou_e_apagou: 'Autorização retirada e ficha apagada',
};

export function TelaAnamnese({ d, erro, acoes }: {
  d: DadosAnamnese; erro?: string;
  acoes: { autorizar: Acao; desbloquear: Acao; bloquear: Acao; salvar: Acao; revogar: Acao };
}) {
  const voltar = `/clientes/${d.cliente.id}`;
  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar={voltar} voltarRotulo={d.cliente.nome}>Anamnese</Titulo>
      <Aviso erro={erro} />

      {d.estado === 'sem_chave' && (
        <Cartao>
          <p className="flex items-center gap-2 text-base font-bold"><ShieldOff className="size-5 text-amber-700" aria-hidden />Anamnese ainda não ativada</p>
          <p className="mt-1 text-[0.9rem] text-stone-600">Antes de guardar dados de saúde, esta instalação precisa de uma chave de proteção. Leva 2 minutos.</p>
          <Link href="/ajustes/anamnese" className={`${btnPrimario} mt-3 w-full`}>Ativar a anamnese</Link>
        </Cartao>
      )}

      {d.estado === 'sem_consentimento' && (
        <>
          <Cartao>
            <p className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="size-5 text-emerald-700" aria-hidden />Primeiro, a autorização dela</p>
            <p className="mt-1 text-[0.9rem] text-stone-600">
              Dado de saúde só pode ser anotado com autorização específica da cliente. Envie o pedido pelo WhatsApp: ele explica para que serve, quem vê e como pedir para apagar.
            </p>
            {d.pedido && (
              <WhatsAppButton className={`${d.pedidoEnviado ? btnSecundario : btnPrimario} mt-3 w-full`} href={d.pedido.href} registrar={d.pedido.registrar}>
                <MessageCircle className="size-5" aria-hidden />{d.pedidoEnviado ? 'Enviar o pedido de novo' : 'Pedir autorização no WhatsApp'}
              </WhatsAppButton>
            )}
          </Cartao>
          {d.pedidoEnviado && (
            <Cartao className="ring-2 ring-emerald-600">
              <h2 className="text-base font-bold">Ela respondeu autorizando?</h2>
              <form action={acoes.autorizar} className="mt-3 space-y-3">
                <input type="hidden" name="cliente_id" value={d.cliente.id} />
                <label className="block"><span className={rotulo}>O que ela escreveu (opcional)</span><input name="resposta" maxLength={200} placeholder='Ex.: "AUTORIZO"' className={campo} /></label>
                <Enviar className={`${btnPrimario} w-full`}>Ela autorizou</Enviar>
              </form>
              <p className="mt-2 text-[0.8rem] text-stone-500">Sem autorização, não preencha. Pergunte só o que for preciso para a segurança da sessão, sem anotar.</p>
            </Cartao>
          )}
        </>
      )}

      {d.estado === 'bloqueada' && (
        <Cartao>
          <p className="flex items-center gap-2 text-base font-bold"><Lock className="size-5 text-stone-600" aria-hidden />Ficha protegida</p>
          <p className="mt-1 text-[0.9rem] text-stone-600">
            {d.versoes.length ? `Última atualização em ${d.versoes[0].data}.` : 'Autorizada, ainda não preenchida.'} Para abrir, digite sua senha. A ficha fecha sozinha em 5 minutos.
          </p>
          <form action={acoes.desbloquear} className="mt-3 space-y-3">
            <input type="hidden" name="cliente_id" value={d.cliente.id} />
            <label className="block"><span className={rotulo}>Sua senha</span><input type="password" name="senha" required autoComplete="current-password" className={campo} /></label>
            <Enviar className={`${btnPrimario} w-full`}><LockOpen className="size-5" aria-hidden />Abrir anamnese</Enviar>
          </form>
        </Cartao>
      )}

      {d.estado === 'aberta' && (d.editar || !d.respostas) && !d.erroLeitura && (
        <form action={acoes.salvar} className="space-y-5">
          <input type="hidden" name="cliente_id" value={d.cliente.id} />
          <input type="hidden" name="modelo" value={d.modelo.id} />
          {d.modelo.grupos.map((g) => (
            <fieldset key={g.titulo} className="min-w-0 space-y-3">
              <legend className="mb-2 text-[0.8rem] font-bold uppercase tracking-wider text-stone-500">{g.titulo}</legend>
              {g.campos.map((c) => {
                const r = d.respostas?.[c.id];
                if (c.tipo === 'simnao') return (
                  <div key={c.id} className="group/c rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80">
                    <p className="text-base font-semibold leading-snug">{c.rotulo}</p>
                    <div className="mt-2 flex gap-2">
                      {[['nao', 'Não'], ['sim', 'Sim']].map(([v, t]) => (
                        <label key={v} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-stone-200 text-base font-semibold has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50">
                          <input type="radio" name={`c_${c.id}`} value={v} defaultChecked={r?.valor === v} className={`sr-only ${v === 'sim' ? 'sim' : ''}`} />{t}
                        </label>
                      ))}
                    </div>
                    {c.detalhe && (
                      <label className="mt-2 hidden group-has-[.sim:checked]/c:block">
                        <span className="sr-only">{c.detalhe}</span>
                        <input name={`d_${c.id}`} maxLength={120} defaultValue={r?.detalhe ?? ''} placeholder={c.detalhe} className={campo} />
                      </label>
                    )}
                  </div>
                );
                if (c.tipo === 'escolha') return (
                  <label key={c.id} className="block">
                    <span className={rotulo}>{c.rotulo}</span>
                    <select name={`c_${c.id}`} defaultValue={r?.valor ?? ''} className={campo}>
                      <option value="">—</option>
                      {c.opcoes.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                );
                return (
                  <label key={c.id} className="block">
                    <span className={rotulo}>{c.rotulo}</span>
                    {c.max > 150
                      ? <textarea name={`c_${c.id}`} maxLength={c.max} rows={3} defaultValue={r?.valor ?? ''} className={`${campo} py-3`} />
                      : <input name={`c_${c.id}`} maxLength={c.max} defaultValue={r?.valor ?? ''} className={campo} />}
                    {c.dica && <span className="mt-1 block text-[0.8rem] text-stone-500">{c.dica}</span>}
                  </label>
                );
              })}
            </fieldset>
          ))}
          <div className="flex gap-2">
            {d.respostas && <Link href={`/clientes/${d.cliente.id}/anamnese`} className={`${btnSecundario} flex-1`}>Voltar</Link>}
            <Enviar className={`${btnPrimario} flex-1`}>Salvar anamnese</Enviar>
          </div>
        </form>
      )}

      {d.estado === 'aberta' && d.erroLeitura && <Aviso erro={d.erroLeitura} />}

      {d.estado === 'aberta' && d.respostas && !d.editar && !d.erroLeitura && (
        <>
          {d.alertas.length > 0 ? (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="flex items-center gap-2 text-base font-bold text-amber-950"><AlertTriangle className="size-5" aria-hidden />Atenção antes de atender</p>
              <ul className="mt-2 space-y-1 text-[0.95rem] text-amber-950">
                {d.alertas.map((a) => <li key={a.rotulo}>• {a.rotulo.replace(/\?$/, '')}{a.detalhe ? `: ${a.detalhe}` : ''}</li>)}
              </ul>
            </div>
          ) : (
            <Aviso ok="Nenhum ponto de atenção marcado." />
          )}
          {d.modelo.grupos.map((g) => (
            <Secao key={g.titulo} titulo={g.titulo}>
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
                {g.campos.map((c) => {
                  const r = d.respostas![c.id];
                  const valor = !r ? '—' : c.tipo === 'simnao' ? (r.valor === 'sim' ? 'Sim' : 'Não') : r.valor;
                  return (
                    <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <span className="text-[0.95rem] text-stone-700">{c.rotulo}{r?.detalhe ? <span className="block text-[0.85rem] text-stone-500">{r.detalhe}</span> : null}</span>
                      <span className={`shrink-0 text-[0.95rem] font-semibold ${r?.valor === 'sim' ? 'text-amber-800' : ''}`}>{valor}</span>
                    </li>
                  );
                })}
              </ul>
            </Secao>
          ))}
          <div className="flex gap-2">
            <Link href={`/clientes/${d.cliente.id}/anamnese?editar=1`} className={`${btnPrimario} flex-1`}><Pencil className="size-4" aria-hidden />Atualizar</Link>
            <form action={acoes.bloquear} className="flex-1"><input type="hidden" name="cliente_id" value={d.cliente.id} /><Enviar className={`${btnSecundario} w-full`}><Lock className="size-4" aria-hidden />Fechar</Enviar></form>
          </div>
        </>
      )}

      {(d.estado === 'bloqueada' || d.estado === 'aberta') && (
        <>
          {d.consentimento && (
            <p className="flex flex-wrap items-center gap-1.5 text-[0.85rem] text-stone-500">
              <Chip tom="verde"><ShieldCheck className="size-3.5" aria-hidden />Autorizada</Chip> em {d.consentimento.data}{d.consentimento.resposta ? ` · “${d.consentimento.resposta}”` : ''}
            </p>
          )}
          {d.versoes.length > 0 && (
            <Secao titulo="Versões">
              <p className="text-[0.85rem] text-stone-600">{d.versoes.map((v) => `v${v.versao} em ${v.data}`).join(' · ')}</p>
            </Secao>
          )}
          <Secao titulo="Registro de acesso">
            <ul className="space-y-1 text-[0.85rem] text-stone-600">
              {d.acessos.map((a, i) => <li key={i} className="flex items-center gap-2"><History className="size-3.5 text-stone-400" aria-hidden />{a.data} · {ACAO[a.acao] ?? a.acao}</li>)}
            </ul>
          </Secao>
          <Confirmar rotulo="Cliente pediu para apagar…" pergunta="Apagar todas as versões da anamnese e registrar que ela retirou a autorização? Não dá para desfazer.">
            <form action={acoes.revogar}>
              <input type="hidden" name="cliente_id" value={d.cliente.id} />
              <Enviar className={`${btnPerigo} w-full`}>Sim, apagar a anamnese</Enviar>
            </form>
          </Confirmar>
          <p className="text-[0.8rem] text-stone-500">Pedido de cópia: abra a ficha e mostre ou envie as respostas à cliente. <Link href="/wiki/tutoriais/anamnese" className={`${btnTexto} inline min-h-0 px-0 text-[0.8rem]`}>Como funciona</Link></p>
        </>
      )}
    </div>
  );
}
