// Regras puras de criar/editar pacote (sem banco), testadas em scripts/test-pacote.mjs.

export type ItemEnviado = {
  id?: string | null; servico_id?: string | null; nome?: string; duracao_min?: number;
  quantidade: number; preco_unit_centavos?: number | null;
};
export type ServicoCadastro = { id: string; nome: string; duracao_min: number; preco_centavos: number | null };
export type ItemAtual = { id: string; nome: string; usadas: number; temSessaoAtiva: boolean };
export type ItemFinal = {
  id: string | null; servico_id: string | null; nome: string; duracao_min: number;
  quantidade: number; preco_unit_centavos: number | null; ordem: number;
};

export type Plano =
  | { ok: false; erro: string }
  | { ok: true; itens: ItemFinal[]; total: number; remover: string[] };

/**
 * Valida os itens e monta o que gravar. Item de serviço usa nome/duração/preço do cadastro
 * (não do navegador). Na edição: não baixa abaixo do usado e não retira item com sessões.
 */
export function planejarItens(enviados: ItemEnviado[], servicos: ServicoCadastro[], atuais: ItemAtual[] | null): Plano {
  if (!Array.isArray(enviados) || !enviados.length) return { ok: false, erro: 'Escolha pelo menos um serviço ou adicione um item.' };
  if (enviados.length > 10) return { ok: false, erro: 'No máximo 10 serviços por pacote.' };

  const itens: ItemFinal[] = [];
  for (const [ordem, e] of enviados.entries()) {
    const quantidade = Number(e.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) return { ok: false, erro: 'Quantidade de sessões entre 1 e 100.' };
    let base: Omit<ItemFinal, 'id' | 'quantidade' | 'ordem'>;
    if (e.servico_id) {
      const s = servicos.find((x) => x.id === e.servico_id);
      if (!s) return { ok: false, erro: 'Um dos serviços não está mais cadastrado. Confira a lista.' };
      base = { servico_id: s.id, nome: s.nome, duracao_min: s.duracao_min, preco_unit_centavos: s.preco_centavos };
    } else {
      const nome = String(e.nome ?? '').trim();
      const duracao = Number(e.duracao_min);
      if (!nome) return { ok: false, erro: 'Dê um nome a cada item manual.' };
      if (nome.length > 80) return { ok: false, erro: 'Nome do item com no máximo 80 letras.' };
      if (!Number.isInteger(duracao) || duracao < 10 || duracao > 480) return { ok: false, erro: 'Duração do item entre 10 min e 8 h.' };
      const preco = e.preco_unit_centavos == null ? null : Number(e.preco_unit_centavos);
      if (preco != null && (!Number.isInteger(preco) || preco < 0)) return { ok: false, erro: `Confira o preço de ${nome}.` };
      base = { servico_id: null, nome, duracao_min: duracao, preco_unit_centavos: preco };
    }
    const id = e.id ? String(e.id) : null;
    if (id) {
      const atual = atuais?.find((a) => a.id === id);
      if (!atual) return { ok: false, erro: 'Um item não pertence a este pacote. Abra a edição de novo.' };
      if (quantidade < atual.usadas) return { ok: false, erro: `${base.nome} já tem ${atual.usadas} sessões usadas; a quantidade não pode ser menor.` };
    }
    itens.push({ ...base, id, quantidade, ordem });
  }

  const ids = itens.map((i) => i.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) return { ok: false, erro: 'Item repetido no pacote.' };

  const remover = (atuais ?? []).filter((a) => !ids.includes(a.id));
  const travado = remover.find((a) => a.usadas > 0 || a.temSessaoAtiva);
  if (travado) return { ok: false, erro: `${travado.nome} já tem sessões marcadas ou usadas. Diminua a quantidade em vez de retirar.` };

  const total = itens.reduce((a, i) => a + i.quantidade, 0);
  if (total < 1 || total > 100) return { ok: false, erro: 'O pacote precisa ter de 1 a 100 sessões no total.' };
  return { ok: true, itens, total, remover: remover.map((r) => r.id) };
}

/** "Pago" depois de mudar o valor: mantém se o valor não mudou; senão compara com o recebido. */
export function pagoAposEdicao(pagoAntes: boolean, valorAntes: number, valorNovo: number, recebido: number) {
  if (valorAntes === valorNovo) return pagoAntes;
  return recebido > 0 && recebido >= valorNovo;
}
