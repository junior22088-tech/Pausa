// Formatação, datas no fuso de São Paulo, telefone e textos de WhatsApp.
export const TZ = 'America/Sao_Paulo';
const OFFSET = '-03:00'; // o Brasil não tem horário de verão desde 2019

export function reais(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function paraCentavos(valor: string) {
  // Aceita "900", "900,00", "900.00", "1.200", "1.200,50", "R$ 1 200,00".
  let limpo = valor.replace(/[^\d,.]/g, '');
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');           // vírgula é decimal; ponto é milhar
  } else if (/\.\d{1,2}$/.test(limpo) && (limpo.match(/\./g) ?? []).length === 1) {
    // "900.00" ou "99.9": ponto como decimal
  } else {
    limpo = limpo.replace(/\./g, '');                              // "1.200" → 1200
  }
  const n = Math.round(parseFloat(limpo) * 100);
  return Number.isFinite(n) ? n : NaN;
}

/** Data de hoje (ou de `d`) em São Paulo, no formato AAAA-MM-DD. */
export function diaSP(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

export function inicioDoDia(dia: string) {
  return new Date(`${dia}T00:00:00${OFFSET}`);
}

export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaSP(d);
}

/** "2026-11-03" + "14:30" → instante em São Paulo. */
export function instanteSP(dia: string, hora: string) {
  return new Date(`${dia}T${hora}:00${OFFSET}`).toISOString();
}

export function hora(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function dataCurta(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso));
}

/** "segunda-feira, 3 de novembro" */
export function dataPorExtenso(isoOuDia: string, comSemana = true) {
  const d = isoOuDia.length === 10 ? new Date(`${isoOuDia}T12:00:00${OFFSET}`) : new Date(isoOuDia);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, day: 'numeric', month: 'long', ...(comSemana ? { weekday: 'long' } : {}),
  }).format(d);
}

/** Aceita (11) 99999-0000, 11999990000 ou +55... e devolve 5511999990000. */
export function normalizarTelefone(entrada: string) {
  let n = entrada.replace(/\D/g, '');
  if (n.startsWith('0')) n = n.replace(/^0+/, '');
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return /^\d{12,13}$/.test(n) ? n : null;
}

export function telefoneBonito(e164: string) {
  const n = e164.replace(/^55/, '');
  return n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
}

export function linkWhatsApp(telefone: string, texto: string) {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
}

type Prof = { nome_mensagem: string; especialidade: string | null; endereco: string | null };

function cabecalho(p: Prof) {
  return p.especialidade ? `${p.nome_mensagem} – ${p.especialidade}` : p.nome_mensagem;
}

// Textos do agente 03 (Design). Sem dado de saúde: aparecem na tela bloqueada.
export function msgLembrete(p: Prof, cliente: string, inicio: string, prazo: string) {
  return [
    cabecalho(p),
    `Olá, ${cliente}! Lembrando da sua sessão:`,
    `*${dataPorExtenso(inicio)}, às ${hora(inicio)}*`,
    ...(p.endereco ? [p.endereco] : []),
    `Para remarcar, me avise por aqui ${prazo}.`,
  ].join('\n');
}

type ItemMsg = { nome: string; quantidade: number; duracao_min: number; saldo?: number };

export function msgSaldo(p: Prof, cliente: string, saldo: number, total: number, validade: string, correcao = false, itens: ItemMsg[] = []) {
  return [
    cabecalho(p),
    correcao ? `Olá, ${cliente}! Correção do seu saldo:` : `Olá, ${cliente}! Sessão de hoje registrada.`,
    `*Restam ${saldo} de ${total} sessões* no seu pacote.`,
    // Pacote com mais de um serviço: o saldo de cada um.
    ...(itens.length > 1 ? itens.map((i) => `• ${i.nome}: ${i.saldo ?? 0} de ${i.quantidade}`) : []),
    `Válido até ${dataPorExtenso(validade, false)}.`,
  ].join('\n');
}

export function msgResumoPacote(
  p: Prof, cliente: string, itens: ItemMsg[], valor: number, pago: boolean, validade: string, regra: string, versao = 1,
) {
  const total = itens.reduce((a, i) => a + i.quantidade, 0);
  const sessoes = (n: number) => `${n} ${n === 1 ? 'sessão' : 'sessões'}`;
  return [
    cabecalho(p),
    versao > 1 ? `Olá, ${cliente}! Este é o resumo *atualizado* do seu pacote:` : `Olá, ${cliente}! Este é o resumo do seu pacote:`,
    ...itens.map((i) => `• ${sessoes(i.quantidade)} de ${i.nome} (${i.duracao_min} min)`),
    ...(itens.length > 1 ? [`• Total: ${sessoes(total)}`] : []),
    `• Valor: ${reais(valor)} (${pago ? 'pago' : 'a pagar'})`,
    `• Válido até ${dataPorExtenso(validade, false)}`,
    `• ${regra}`,
    'Se estiver de acordo, responda *ACEITO*.',
    'Se tiver dúvida, é só me escrever.',
  ].join('\n');
}

/** Aviso de que a sessão precisa ser remarcada (folga ou bloqueio na agenda). */
export function msgRemarcarPorFolga(p: Prof, cliente: string, inicio: string) {
  return [
    cabecalho(p),
    `Olá, ${cliente}! Precisei bloquear minha agenda e não vou conseguir atender na sua sessão de`,
    `*${dataPorExtenso(inicio)}, às ${hora(inicio)}*.`,
    'Podemos remarcar? Me diga um dia e horário que fica bom para você.',
  ].join('\n');
}
