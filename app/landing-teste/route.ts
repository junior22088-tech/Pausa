// Página de venda em teste: o HTML da landing (feita no canvas de design) servido como está.
// Não indexada (meta robots noindex). Pública: ver PUBLICAS em proxy.ts.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-static';

export function GET() {
  const html = readFileSync(path.join(process.cwd(), 'content', 'landing-teste.html'), 'utf8');
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
