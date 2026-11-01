// Valores públicos por natureza (vão para o navegador). A proteção dos dados é o RLS.
// Variáveis de ambiente, se definidas, têm prioridade.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mefpbqlymcfjenyzrylk.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_sQdL2vJcCktfcsMEIH5A6Q_C8c371SQ';
