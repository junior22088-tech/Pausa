// Regras da licença, sem rede nem banco: testáveis isoladamente (scripts/test-licenca-app.mjs).

export const REVALIDAR_MS = 12 * 60 * 60 * 1000;
export const TOLERANCIA_MS = 7 * 24 * 60 * 60 * 1000;
export const AVISO_DIAS = 30;

export type Status =
  | 'ativa' | 'vencida' | 'revogada' | 'invalida' | 'limite_dominios'
  | 'sem_chave' | 'sem_resposta' | 'dispensada';

export type EstadoLicenca = {
  status: Status;
  podeGravar: boolean;
  expiraEm: string | null;
  diasRestantes: number | null;
  offline: boolean;              // usando a última resposta guardada porque o servidor não respondeu
  verificadoEm: string | null;
  dominio: string;
  finalChave: string | null;     // últimos 8 caracteres, para o suporte
  aviso: string | null;          // texto curto para a faixa no topo
};

type Resposta = { status: Status; expira_em?: string | null; dias_restantes?: number | null };
export type Guardado = { status: Status; expira_em: string | null; dominio: string | null; verificado_em: string; ultima_ativa_em: string | null };

export const MOTIVOS: Record<Status, string> = {
  ativa: 'Licença ativa.',
  vencida: 'A licença venceu.',
  revogada: 'A licença foi cancelada.',
  invalida: 'A chave de licença não foi reconhecida.',
  limite_dominios: 'A chave já está em uso em outro endereço.',
  sem_chave: 'Esta instalação ainda não tem chave de licença.',
  sem_resposta: 'Não foi possível confirmar a licença há mais de 7 dias.',
  dispensada: 'Instalação do autor.',
};

export function chaveDaInstalacao() {
  return (process.env.PAUSA_LICENCA ?? '').trim() || null;
}

function diasAte(data: string | null | undefined, agora: number) {
  if (!data) return null;
  return Math.max(0, Math.ceil((new Date(data).getTime() - agora) / 86_400_000));
}

/** Pergunta ao servidor do autor. null = sem resposta (rede, servidor fora do ar, timeout). */
export async function consultarServidor(
  chave: string, dominio: string, servidor: { url: string; chave: string }, f: typeof fetch = fetch,
): Promise<Resposta | null> {
  try {
    const r = await f(`${servidor.url}/rest/v1/rpc/verificar_licenca`, {
      method: 'POST',
      headers: { apikey: servidor.chave, Authorization: `Bearer ${servidor.chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave, dominio }),
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const corpo = (await r.json()) as Resposta;
    return corpo && typeof corpo.status === 'string' ? corpo : null;
  } catch {
    return null;
  }
}

/**
 * Decide o estado a partir do que está guardado e (se preciso) da resposta do servidor.
 * Função pura: recebe tudo de fora, para poder ser testada sem rede nem banco.
 */
export function decidir(args: {
  chave: string | null; dominio: string; agora: number;
  guardado: Guardado | null; resposta: Resposta | null; consultou: boolean;
}): EstadoLicenca {
  const { chave, dominio, agora, guardado, resposta, consultou } = args;
  const base = { dominio, finalChave: chave ? chave.slice(-8).toUpperCase() : null };
  const montar = (status: Status, expiraEm: string | null, verificadoEm: string | null, offline = false): EstadoLicenca => {
    const ativa = status === 'ativa' || status === 'dispensada';
    const dias = diasAte(expiraEm, agora);
    let aviso: string | null = null;
    if (!ativa) aviso = `${MOTIVOS[status]} O Pausa está só para consulta.`;
    else if (status === 'ativa' && dias !== null && dias <= AVISO_DIAS) aviso = `Sua licença vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;
    return { ...base, status, podeGravar: ativa, expiraEm, diasRestantes: dias, offline, verificadoEm, aviso };
  };

  if (!chave) return montar('sem_chave', null, null);

  // Resposta nova do servidor.
  if (consultou && resposta) {
    const venceu = resposta.status === 'ativa' && resposta.expira_em && new Date(resposta.expira_em).getTime() < agora;
    return montar(venceu ? 'vencida' : resposta.status, resposta.expira_em ?? null, new Date(agora).toISOString());
  }

  // Sem resposta (ou não precisou consultar): usa o que está guardado.
  if (guardado && guardado.dominio === dominio) {
    const recente = agora - new Date(guardado.verificado_em).getTime() < REVALIDAR_MS;
    const venceu = guardado.expira_em && new Date(guardado.expira_em).getTime() < agora;
    if (guardado.status === 'ativa' && venceu) return montar('vencida', guardado.expira_em, guardado.verificado_em, !recente);
    if (recente) return montar(guardado.status, guardado.expira_em, guardado.verificado_em);
    // Servidor não respondeu: a última confirmação "ativa" vale por 7 dias.
    const ultimaAtiva = guardado.ultima_ativa_em ? new Date(guardado.ultima_ativa_em).getTime() : 0;
    if (guardado.status === 'ativa' && agora - ultimaAtiva < TOLERANCIA_MS) {
      return montar('ativa', guardado.expira_em, guardado.verificado_em, true);
    }
    if (guardado.status !== 'ativa') return montar(guardado.status, guardado.expira_em, guardado.verificado_em, true);
  }
  return montar('sem_resposta', null, guardado?.verificado_em ?? null, true);
}

