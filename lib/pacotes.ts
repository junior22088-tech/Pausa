// Pacotes com vários serviços (itens): leitura do saldo por item e escolha do que marcar.
import type { createClient } from '@/lib/supabase/server';
import { diaSP } from '@/lib/format';

type Supa = Awaited<ReturnType<typeof createClient>>;

export type ItemPacote = {
  id: string; pacote_id: string; servico_id: string | null; nome: string; duracao_min: number;
  quantidade: number; preco_unit_centavos: number | null; ordem: number; usadas: number; saldo: number;
};

export async function itensDosPacotes(supabase: Supa, pacoteIds: string[]): Promise<ItemPacote[]> {
  if (!pacoteIds.length) return [];
  const { data } = await supabase.from('pacote_itens_saldo')
    .select('id, pacote_id, servico_id, nome, duracao_min, quantidade, preco_unit_centavos, ordem, usadas, saldo')
    .in('pacote_id', pacoteIds).order('ordem').order('criado_em');
  return (data ?? []) as ItemPacote[];
}

/** Pacote em uso do cliente (o mais antigo na validade e com saldo), com os itens. */
export async function pacoteEmUso(supabase: Supa, clienteId: string) {
  const { data: p } = await supabase.from('pacotes_saldo').select('id, saldo, total_sessoes')
    .eq('cliente_id', clienteId).in('situacao', ['aguardando_aceite', 'aceito'])
    .gte('validade_ate', diaSP()).gt('saldo', 0).order('criado_em', { ascending: true }).limit(1).maybeSingle();
  if (!p) return null;
  return { ...p, itens: await itensDosPacotes(supabase, [p.id]) };
}

export type Servico = { id: string; nome: string; duracao_min: number; preco_centavos: number | null };

export type Escolha = {
  /** Valor da opção no formulário: "item:<id>" ou o id do serviço. */
  valor: string;
  nome: string;
  duracao: number;
  servicoId: string | null;
  pacoteId: string | null;
  itemId: string | null;
  saldoItem: number | null;
  precoAvulso: number | null;
};

/**
 * O que vai ser marcado. `valor`:
 * - "item:<id>": um serviço do pacote (com saldo);
 * - id de serviço: usa o item do pacote com esse serviço, se tiver saldo; senão é avulsa;
 * - vazio: o primeiro item do pacote com saldo; senão o único serviço; senão nada.
 */
export function resolverEscolha(
  valor: string | null | undefined,
  pacote: Awaited<ReturnType<typeof pacoteEmUso>>,
  servicos: Servico[],
): Escolha | null {
  const itens = (pacote?.itens ?? []).filter((i) => i.saldo > 0);
  const deItem = (i: ItemPacote): Escolha => ({
    valor: `item:${i.id}`, nome: i.nome, duracao: i.duracao_min, servicoId: i.servico_id,
    pacoteId: i.pacote_id, itemId: i.id, saldoItem: i.saldo, precoAvulso: null,
  });
  const deServico = (s: Servico): Escolha => ({
    valor: s.id, nome: s.nome, duracao: s.duracao_min, servicoId: s.id,
    pacoteId: null, itemId: null, saldoItem: null, precoAvulso: s.preco_centavos,
  });
  if (valor?.startsWith('item:')) {
    const i = itens.find((x) => x.id === valor.slice(5));
    return i ? deItem(i) : null;
  }
  if (valor) {
    const i = itens.find((x) => x.servico_id === valor);
    if (i) return deItem(i);
    const s = servicos.find((x) => x.id === valor);
    return s ? deServico(s) : null;
  }
  if (itens[0]) return deItem(itens[0]);
  if (servicos.length === 1) return deServico(servicos[0]);
  return null;
}
