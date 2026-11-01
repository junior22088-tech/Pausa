'use client';

// Montagem do pacote: serviços da lista (com quantidade) + itens manuais, e o valor
// que acompanha a soma até a pessoa digitar outro (ex.: dar desconto).
import { useMemo, useState } from 'react';
import { Minus, PenLine, Plus, Sparkles, X } from 'lucide-react';
import { campo, rotulo } from '@/components/ui';

export type ServicoOpcao = { id: string; nome: string; duracao_min: number; preco_centavos: number | null };
export type ItemInicial = {
  id?: string; servico_id: string | null; nome: string; duracao_min: number;
  quantidade: number; preco_unit_centavos: number | null; usadas?: number;
};

type Manual = { chave: string; id?: string; nome: string; duracao_min: number; quantidade: number; preco: string; usadas: number };

const DURACOES = [15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180];
const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paraCampo = (c: number | null) => (c == null ? '' : (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
function centavos(v: string) {
  let s = v.replace(/[^\d,.]/g, '');
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : null;
}
const dur = (d: number) => (d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60}` : ''}`);
let seq = 0;

function Contador({ valor, minimo, aoMudar, rotuloAcessivel }: { valor: number; minimo: number; aoMudar: (n: number) => void; rotuloAcessivel: string }) {
  const botao = 'inline-flex size-10 items-center justify-center rounded-full bg-stone-100 text-stone-800 active:bg-stone-200 disabled:opacity-40';
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={botao} disabled={valor <= minimo} onClick={() => aoMudar(Math.max(minimo, valor - 1))} aria-label={`Menos ${rotuloAcessivel}`}><Minus className="size-4" /></button>
      <input
        value={valor || ''} placeholder="0" inputMode="numeric" aria-label={`Quantidade de ${rotuloAcessivel}`}
        onChange={(e) => aoMudar(Math.min(100, Number(e.target.value.replace(/\D/g, '') || 0)))}
        onBlur={() => valor < minimo && aoMudar(minimo)}
        className="h-10 w-12 rounded-lg border border-stone-300 bg-white text-center text-base font-semibold"
      />
      <button type="button" className={botao} disabled={valor >= 100} onClick={() => aoMudar(valor + 1)} aria-label={`Mais ${rotuloAcessivel}`}><Plus className="size-4" /></button>
    </div>
  );
}

export function ItensPacote({
  servicos, iniciais, valorInicial,
}: { servicos: ServicoOpcao[]; iniciais: ItemInicial[]; valorInicial: number | null }) {
  // Quantidade por serviço da lista (0 = fora do pacote) e o id do item já existente (edição).
  const [qtd, setQtd] = useState<Record<string, number>>(() =>
    Object.fromEntries(servicos.map((s) => [s.id, iniciais.find((i) => i.servico_id === s.id)?.quantidade ?? 0])));
  const existentes = useMemo(() => Object.fromEntries(iniciais.filter((i) => i.servico_id).map((i) => [i.servico_id!, i])), [iniciais]);
  // Itens manuais (e itens cujo serviço saiu da lista).
  const [manuais, setManuais] = useState<Manual[]>(() => {
    const m: Manual[] = iniciais.filter((i) => !i.servico_id || !servicos.some((s) => s.id === i.servico_id)).map((i) => ({
      chave: `m${seq++}`, id: i.id, nome: i.nome, duracao_min: i.duracao_min, quantidade: i.quantidade,
      preco: paraCampo(i.preco_unit_centavos), usadas: i.usadas ?? 0,
    }));
    // Sem serviços cadastrados e pacote novo: já começa com um item manual.
    if (!m.length && !servicos.length && !iniciais.length) m.push({ chave: `m${seq++}`, nome: 'Sessão', duracao_min: 60, quantidade: 10, preco: '', usadas: 0 });
    return m;
  });

  const linhas = [
    ...servicos.filter((s) => qtd[s.id] > 0).map((s) => ({
      id: existentes[s.id]?.id, servico_id: s.id, nome: s.nome, duracao_min: s.duracao_min, quantidade: qtd[s.id], preco_unit_centavos: s.preco_centavos,
    })),
    ...manuais.filter((m) => m.quantidade > 0).map((m) => ({
      id: m.id, servico_id: null, nome: m.nome.trim(), duracao_min: m.duracao_min, quantidade: m.quantidade, preco_unit_centavos: centavos(m.preco),
    })),
  ];
  const total = linhas.reduce((a, l) => a + l.quantidade, 0);
  const soma = linhas.reduce((a, l) => a + l.quantidade * (l.preco_unit_centavos ?? 0), 0);
  const semPreco = linhas.some((l) => l.preco_unit_centavos == null);

  // O valor segue a soma até a pessoa digitar outro.
  const [valorDigitado, setValorDigitado] = useState<string | null>(valorInicial != null ? paraCampo(valorInicial) : null);
  const valor = valorDigitado ?? (soma > 0 ? paraCampo(soma) : '');
  const mudarManual = (chave: string, p: Partial<Manual>) => setManuais((l) => l.map((m) => (m.chave === chave ? { ...m, ...p } : m)));

  return (
    <div className="space-y-5">
      <input type="hidden" name="itens" value={JSON.stringify(linhas)} />

      {servicos.length > 0 && (
        <fieldset className="min-w-0">
          <legend className={rotulo}>Serviços da sua lista</legend>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/80">
            {servicos.map((s) => {
              const usadas = existentes[s.id]?.usadas ?? 0;
              return (
                <li key={s.id} className={`flex min-h-16 items-center gap-3 px-4 py-3 ${qtd[s.id] > 0 ? 'bg-emerald-50/50' : ''}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-snug">{s.nome}</span>
                    <span className="block text-[0.8rem] text-stone-500">
                      {dur(s.duracao_min)}{s.preco_centavos != null ? ` · ${reais(s.preco_centavos)}` : ''}{usadas ? ` · ${usadas} usada${usadas > 1 ? 's' : ''}` : ''}
                    </span>
                  </span>
                  <Contador valor={qtd[s.id]} minimo={usadas} rotuloAcessivel={s.nome} aoMudar={(n) => setQtd((q) => ({ ...q, [s.id]: n }))} />
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset className="min-w-0 space-y-3">
        <legend className={rotulo}>{servicos.length ? 'Itens fora da lista' : 'Itens do pacote'}</legend>
        {manuais.map((m) => (
          <div key={m.chave} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80">
            <div className="flex items-start gap-2">
              <label className="block flex-1">
                <span className="sr-only">Nome do item</span>
                <input value={m.nome} maxLength={80} placeholder="Ex.: Drenagem linfática" onChange={(e) => mudarManual(m.chave, { nome: e.target.value })} className={campo} />
              </label>
              {m.usadas === 0 && (
                <button type="button" onClick={() => setManuais((l) => l.filter((x) => x.chave !== m.chave))}
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100" aria-label={`Tirar ${m.nome || 'item'}`}>
                  <X className="size-5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[0.8rem] font-semibold text-stone-600">Duração</span>
                <select value={m.duracao_min} onChange={(e) => mudarManual(m.chave, { duracao_min: Number(e.target.value) })} className={campo}>
                  {[...new Set([...DURACOES, m.duracao_min])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{dur(d)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.8rem] font-semibold text-stone-600">Preço por sessão</span>
                <input value={m.preco} inputMode="decimal" placeholder="opcional" onChange={(e) => mudarManual(m.chave, { preco: e.target.value })} className={campo} />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.85rem] font-semibold text-stone-600">Sessões{m.usadas ? ` (${m.usadas} usada${m.usadas > 1 ? 's' : ''})` : ''}</span>
              <Contador valor={m.quantidade} minimo={Math.max(1, m.usadas)} rotuloAcessivel={m.nome || 'item'} aoMudar={(n) => mudarManual(m.chave, { quantidade: n })} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setManuais((l) => [...l, { chave: `m${seq++}`, nome: '', duracao_min: 60, quantidade: 1, preco: '', usadas: 0 }])}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 text-base font-semibold text-emerald-800 hover:bg-emerald-50">
          <PenLine className="size-4" aria-hidden />Adicionar item manual
        </button>
      </fieldset>

      {/* Resumo + valor */}
      <div className="rounded-2xl bg-stone-100 p-4">
        <p className="flex items-center gap-1.5 text-base font-semibold">
          <Sparkles className="size-4 text-emerald-700" aria-hidden />
          {total ? `${total} ${total === 1 ? 'sessão' : 'sessões'} no total` : 'Escolha pelo menos um serviço'}
        </p>
        {linhas.length > 0 && (
          <ul className="mt-1 text-[0.85rem] text-stone-600">
            {linhas.map((l, i) => <li key={i}>{l.quantidade}× {l.nome || 'item sem nome'}{l.preco_unit_centavos != null ? ` · ${reais(l.quantidade * l.preco_unit_centavos)}` : ''}</li>)}
          </ul>
        )}
        <label className="mt-3 block">
          <span className={rotulo}>Valor do pacote</span>
          <input name="valor" required inputMode="decimal" value={valor} placeholder="R$ 900,00" onChange={(e) => setValorDigitado(e.target.value)} className={campo} />
        </label>
        {soma > 0 && (
          valorDigitado != null && centavos(valorDigitado) !== soma ? (
            <button type="button" onClick={() => setValorDigitado(null)} className="mt-1 text-[0.85rem] font-semibold text-emerald-800 underline">
              Usar a soma: {reais(soma)}
            </button>
          ) : (
            <p className="mt-1 text-[0.8rem] text-stone-500">Soma dos preços{semPreco ? ' (itens sem preço contam zero)' : ''}. Mude se quiser dar desconto.</p>
          )
        )}
      </div>
    </div>
  );
}
