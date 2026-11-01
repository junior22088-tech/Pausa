// Cálculo dos horários livres da agenda. Funções puras (sem banco, sem rede):
// testadas em scripts/test-agenda.mjs. Horários em minutos desde 00:00, fuso de São Paulo (-03:00).

export const PASSO_MIN = 15;
export const FORA_INICIO = 6 * 60;   // "Ver horários fora do expediente": de 6h…
export const FORA_FIM = 22 * 60;     // …até 22h

export type DiaSemanaCfg = {
  dia_semana: number; atende: boolean; inicio_min: number; fim_min: number;
  almoco_inicio_min: number | null; almoco_fim_min: number | null;
};
export type Bloqueio = { id?: string; data_inicio: string; data_fim: string; dia_inteiro: boolean; inicio_min: number | null; fim_min: number | null; motivo?: string | null };
/** Uma sessão já marcada no dia: de `inicio` até `fim` (fim = início + duração + intervalo). */
export type Ocupado = { id: string; inicio: number; fim: number; fimAtendimento?: number; nome?: string; servico?: string };

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const paraMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

/** 0 = domingo … 6 = sábado, para uma data AAAA-MM-DD. */
export function diaDaSemana(dia: string) {
  return new Date(`${dia}T12:00:00-03:00`).getUTCDay();
}

/** Minutos desde 00:00 em São Paulo de um instante ISO. */
export function minutosSP(iso: string | Date) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Bloqueios que valem para o dia: folga do dia inteiro e trechos bloqueados. */
export function bloqueiosDoDia(dia: string, bloqueios: Bloqueio[]) {
  const doDia = bloqueios.filter((b) => b.data_inicio <= dia && dia <= b.data_fim);
  return {
    folgaDiaInteiro: doDia.find((b) => b.dia_inteiro) ?? null,
    trechos: doDia.filter((b) => !b.dia_inteiro).map((b) => [b.inicio_min!, b.fim_min!] as [number, number]),
  };
}

const sobrepoe = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

/** A sessão que impede marcar `[t, t + duração + intervalo)`, se houver. */
export function conflito(ocupados: Ocupado[], t: number, duracao: number, intervalo: number, ignorarId?: string) {
  return ocupados.find((o) => o.id !== ignorarId && sobrepoe(t, t + duracao + intervalo, o.inicio, o.fim)) ?? null;
}

export type Livres = {
  /** Horários dentro do expediente (sem almoço, folgas nem sessões). */
  normais: number[];
  /** Horários de 6h a 22h fora do expediente, sem conflito (exceções). */
  fora: number[];
  /** Por que o dia não tem horário normal, quando for o caso. */
  motivo: 'folga' | 'nao_atende' | 'lotado' | 'passado' | null;
  folga: Bloqueio | null;
};

export function horariosLivres(args: {
  dia: string; duracao: number; intervalo: number;
  semana: DiaSemanaCfg[]; bloqueios: Bloqueio[]; ocupados: Ocupado[];
  /** Minutos de agora, se `dia` é hoje (horários que já passaram não aparecem). */
  agoraMin?: number | null;
  ignorarId?: string;
}): Livres {
  const { dia, duracao, intervalo, semana, bloqueios, ocupados, agoraMin, ignorarId } = args;
  const cfg = semana.find((s) => s.dia_semana === diaDaSemana(dia));
  const { folgaDiaInteiro, trechos } = bloqueiosDoDia(dia, bloqueios);
  const livreDeSessoes = (t: number) => !conflito(ocupados, t, duracao, intervalo, ignorarId);
  const futuro = (t: number) => agoraMin == null || t > agoraMin;
  const foraDeTrechos = (t: number) => !trechos.some(([a, b]) => sobrepoe(t, t + duracao, a, b));

  if (folgaDiaInteiro) return { normais: [], fora: [], motivo: 'folga', folga: folgaDiaInteiro };

  const normais: number[] = [];
  if (cfg?.atende) {
    const almoco = cfg.almoco_inicio_min != null && cfg.almoco_fim_min != null ? [cfg.almoco_inicio_min, cfg.almoco_fim_min] : null;
    for (let t = cfg.inicio_min; t + duracao <= cfg.fim_min; t += PASSO_MIN) {
      if (almoco && sobrepoe(t, t + duracao, almoco[0], almoco[1])) continue;
      if (!foraDeTrechos(t) || !livreDeSessoes(t) || !futuro(t)) continue;
      normais.push(t);
    }
  }
  const fora: number[] = [];
  for (let t = FORA_INICIO; t + duracao <= FORA_FIM; t += PASSO_MIN) {
    if (normais.includes(t)) continue;
    if (cfg?.atende) {
      const dentro = t >= cfg.inicio_min && t + duracao <= cfg.fim_min;
      const almoco = cfg.almoco_inicio_min != null && cfg.almoco_fim_min != null && sobrepoe(t, t + duracao, cfg.almoco_inicio_min, cfg.almoco_fim_min);
      if (dentro && !almoco) continue; // dentro do expediente e fora do almoço: só não está livre por conflito
    }
    if (!foraDeTrechos(t) || !livreDeSessoes(t) || !futuro(t)) continue;
    fora.push(t);
  }

  let motivo: Livres['motivo'] = null;
  if (!cfg?.atende) motivo = 'nao_atende';
  else if (normais.length === 0) motivo = agoraMin != null && agoraMin >= cfg.fim_min ? 'passado' : 'lotado';
  return { normais, fora, motivo, folga: null };
}

/** Próximos horários livres a partir de `t` (para sugerir no aviso de conflito). */
export function proximosLivres(livres: Livres, t: number, n = 3) {
  return [...livres.normais, ...livres.fora].filter((x) => x >= t).sort((a, b) => a - b).slice(0, n);
}

/**
 * Espaços livres do expediente de um dia (para o calendário): expediente menos almoço,
 * bloqueios e sessões (com intervalo). A partir de `agoraMin`, se for hoje.
 */
export function espacosLivres(args: {
  dia: string; semana: DiaSemanaCfg[]; bloqueios: Bloqueio[]; ocupados: Ocupado[]; agoraMin?: number | null;
}): [number, number][] {
  const { dia, semana, bloqueios, ocupados, agoraMin } = args;
  const cfg = semana.find((s) => s.dia_semana === diaDaSemana(dia));
  const { folgaDiaInteiro, trechos } = bloqueiosDoDia(dia, bloqueios);
  if (!cfg?.atende || folgaDiaInteiro) return [];
  const tirar: [number, number][] = [
    ...trechos,
    ...ocupados.map((o) => [o.inicio, o.fim] as [number, number]),
    ...(cfg.almoco_inicio_min != null && cfg.almoco_fim_min != null ? [[cfg.almoco_inicio_min, cfg.almoco_fim_min] as [number, number]] : []),
  ].sort((a, b) => a[0] - b[0]);
  let ini = Math.max(cfg.inicio_min, agoraMin != null ? Math.ceil((agoraMin + 1) / PASSO_MIN) * PASSO_MIN : 0);
  const livres: [number, number][] = [];
  for (const [a, b] of tirar) {
    if (b <= ini) continue;
    if (a > ini) livres.push([ini, Math.min(a, cfg.fim_min)]);
    ini = Math.max(ini, b);
    if (ini >= cfg.fim_min) break;
  }
  if (ini < cfg.fim_min) livres.push([ini, cfg.fim_min]);
  return livres.filter(([a, b]) => b > a);
}
