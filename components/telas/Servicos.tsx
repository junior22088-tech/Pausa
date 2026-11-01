import Link from 'next/link';
import { Clock, Plus, Sparkles } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { configAgenda } from '@/lib/agenda-dados';
import { reais } from '@/lib/format';
import { desativarServico, salvarServico } from '@/lib/actions';
import { Aviso, Cartao, Titulo, Vazio, btnPerigo, btnPequeno, btnPrimario, btnSecundario, btnTexto, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

const DURACOES = [15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180];
const centavosParaCampo = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));

export function TelaServicos({ ativos, emEdicao, mostrarForm, novo, intervalo, erro }: { ativos: { id: string; nome: string; duracao_min: number; preco_centavos: number | null }[]; emEdicao: { id: string; nome: string; duracao_min: number; preco_centavos: number | null } | null; mostrarForm: boolean; novo?: string; intervalo: number; erro?: string }) {
  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar="/ajustes" voltarRotulo="Ajustes">Serviços</Titulo>
      <p className="-mt-2 text-[0.9rem] text-stone-600">
        A duração define quais horários aparecem livres ao marcar. Depois de cada sessão o Pausa reserva mais {intervalo} min de intervalo (<Link href="/ajustes/horarios" className="font-semibold text-emerald-800 underline">mudar</Link>).
      </p>
      <Aviso erro={erro} />

      {ativos.length > 0 && (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
          {ativos.map((s) => (
            <li key={s.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800"><Sparkles className="size-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{s.nome}</span>
                <span className="flex items-center gap-1 text-[0.85rem] text-stone-500"><Clock className="size-3.5" aria-hidden />{s.duracao_min} min{s.preco_centavos != null ? ` · ${reais(s.preco_centavos)}` : ''}</span>
              </span>
              <Link href={`/ajustes/servicos?editar=${s.id}`} className={btnTexto}>Editar</Link>
            </li>
          ))}
        </ul>
      )}

      {ativos.length === 0 && !novo && (
        <Vazio icone={<Sparkles className="size-6" aria-hidden />} titulo="Nenhum serviço ainda" texto="Cadastre pelo menos um para a agenda mostrar os horários livres." />
      )}

      {mostrarForm ? (
        <Cartao>
          <h2 className="mb-3 text-base font-bold">{emEdicao ? `Editar ${emEdicao.nome}` : 'Novo serviço'}</h2>
          <form action={salvarServico} className="space-y-4">
            {emEdicao && <input type="hidden" name="id" value={emEdicao.id} />}
            <label className="block"><span className={rotulo}>Nome</span><input name="nome" required maxLength={80} defaultValue={emEdicao?.nome} placeholder="Ex.: Massagem relaxante" className={campo} /></label>
            <label className="block">
              <span className={rotulo}>Duração da sessão</span>
              <select name="duracao" defaultValue={String(emEdicao?.duracao_min ?? 60)} className={campo}>
                {DURACOES.map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60} min` : ''}`}</option>)}
              </select>
            </label>
            <label className="block"><span className={rotulo}>Preço da sessão avulsa (opcional)</span><input name="preco" inputMode="decimal" defaultValue={centavosParaCampo(emEdicao?.preco_centavos ?? null)} placeholder="R$ 120,00" className={campo} /></label>
            {emEdicao && <p className="text-[0.8rem] text-stone-500">Sessões já marcadas continuam com a duração que tinham.</p>}
            <div className="flex gap-2">
              {(emEdicao || novo) && ativos.length > 0 && <Link href="/ajustes/servicos" className={`${btnSecundario} flex-1`}>Voltar</Link>}
              <Enviar className={`${btnPrimario} flex-1`}>Salvar serviço</Enviar>
            </div>
          </form>
          {emEdicao && (
            <form action={desativarServico} className="mt-3">
              <input type="hidden" name="id" value={emEdicao.id} />
              <Enviar className={`${btnPerigo} ${btnPequeno} w-full`}>Remover da lista</Enviar>
            </form>
          )}
        </Cartao>
      ) : (
        <Link href="/ajustes/servicos?novo=1" className={`${btnPrimario} w-full`}><Plus className="size-5" aria-hidden />Novo serviço</Link>
      )}
    </div>
  );
}
