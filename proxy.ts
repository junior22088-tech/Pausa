import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { CONFIGURADO, SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase/config';

const PUBLICAS = ['/login', '/auth', '/wiki', '/configurar', '/dev', '/manifest.webmanifest', '/icon'];

// Renova a sessão do Supabase a cada requisição e protege as telas do app.
export async function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  // Instalação sem Supabase configurado: só a wiki e a página de configuração funcionam.
  if (!CONFIGURADO) {
    if (caminho.startsWith('/wiki') || caminho.startsWith('/configurar') || caminho.startsWith('/dev')) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/configurar';
    url.search = '';
    return NextResponse.redirect(url);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p));

  if (!data.user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)'],
};
