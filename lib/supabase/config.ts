// Configuração do Supabase da instalação.
//
// Cada instalação usa o PRÓPRIO Supabase (variáveis NEXT_PUBLIC_SUPABASE_URL e
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Os valores padrão abaixo são do autor do Pausa e só
// valem no site do autor, reconhecido pelas variáveis de sistema que a Vercel preenche sozinha.
// Uma instalação de comprador sem variáveis NÃO cai no banco do autor: vai para /configurar.

const AUTOR = {
  url: 'https://mefpbqlymcfjenyzrylk.supabase.co',
  chave: 'sb_publishable_sQdL2vJcCktfcsMEIH5A6Q_C8c371SQ',
  repositorio: 'junior22088-tech',
  dominio: 'pausa-erp.vercel.app',
};

/** Verdadeiro só no deploy do autor (repositório e domínio dele na Vercel). */
export const INSTANCIA_DO_AUTOR =
  process.env.VERCEL_GIT_REPO_OWNER === AUTOR.repositorio ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL === AUTOR.dominio;

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? (INSTANCIA_DO_AUTOR ? AUTOR.url : '');
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  (INSTANCIA_DO_AUTOR ? AUTOR.chave : '');

/** A instalação tem Supabase configurado? Se não, o app mostra /configurar. */
export const CONFIGURADO = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Servidor de licenças (do autor). Público por natureza: só responde se uma chave é válida. */
export const LICENCAS = {
  url: process.env.PAUSA_LICENCAS_URL ?? AUTOR.url,
  chave: process.env.PAUSA_LICENCAS_CHAVE_PUBLICA ?? AUTOR.chave,
};

/** O site do autor usa o mesmo Supabase do servidor de licenças e não precisa de chave. */
export const DISPENSA_LICENCA = INSTANCIA_DO_AUTOR && SUPABASE_URL === AUTOR.url;
