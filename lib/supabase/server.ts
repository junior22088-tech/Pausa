import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_URL, SUPABASE_KEY } from './config';
export { SUPABASE_URL, SUPABASE_KEY };

// Um cliente novo por requisição (exigência do @supabase/ssr).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy.ts já renova a sessão.
        }
      },
    },
  });
}

// Usuário logado ou erro. Use em toda página e ação protegida.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Sessão expirada. Entre de novo.');
  return { supabase, user: data.user };
}
