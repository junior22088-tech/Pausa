// Licença da instalação.
//
// Cada instalação tem uma chave (variável PAUSA_LICENCA). O app pergunta ao servidor de licenças
// do autor se a chave vale para este domínio. A resposta fica guardada no banco da instalação por
// 12 horas. Se o servidor não responder, a última resposta "ativa" vale por mais 7 dias.
//
// Sem licença ativa o app fica SÓ LEITURA: a terapeuta vê agenda, clientes e histórico, mas não grava
// nada novo. Nenhum dado é apagado nem escondido.
//
// Só a chave e o domínio vão para o servidor de licenças. Nenhum dado de cliente sai da instalação.

import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DISPENSA_LICENCA, LICENCAS } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { chaveDaInstalacao, consultarServidor, decidir, REVALIDAR_MS, type EstadoLicenca, type Guardado } from '@/lib/licenca-regras';

export { MOTIVOS, type EstadoLicenca, type Status } from '@/lib/licenca-regras';

async function dominioAtual() {
  const h = await headers();
  return (h.get('x-forwarded-host') ?? h.get('host') ?? '').toLowerCase();
}

/** Estado da licença nesta requisição (uma consulta por requisição, no máximo). */
export const estadoLicenca = cache(async (forcar: boolean = false): Promise<EstadoLicenca> => {
  const dominio = await dominioAtual();
  if (DISPENSA_LICENCA) {
    return { status: 'dispensada', podeGravar: true, expiraEm: null, diasRestantes: null, offline: false, verificadoEm: null, dominio, finalChave: null, aviso: null };
  }
  const chave = chaveDaInstalacao();
  const agora = Date.now();
  const supabase = await createClient();
  const { data } = await supabase.rpc('licenca_ler');
  const guardado = (data && (data as Guardado).status ? (data as Guardado) : null);

  const precisaConsultar = !!chave && (
    forcar || !guardado || guardado.dominio !== dominio ||
    agora - new Date(guardado.verificado_em).getTime() >= REVALIDAR_MS
  );
  const resposta = precisaConsultar ? await consultarServidor(chave!, dominio, LICENCAS) : null;
  if (resposta && resposta.status !== 'sem_chave') {
    await supabase.rpc('licenca_gravar', { p_status: resposta.status, p_expira_em: resposta.expira_em ?? null, p_dominio: dominio });
  }
  return decidir({ chave, dominio, agora, guardado, resposta, consultou: precisaConsultar });
});

/** Use no início de toda ação que grava. Sem licença ativa, leva para a página da licença. */
export async function exigirLicenca() {
  const e = await estadoLicenca();
  if (!e.podeGravar) redirect('/instalacao?bloqueado=1');
  return e;
}
