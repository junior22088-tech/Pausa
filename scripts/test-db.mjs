// Roda a migração e o teste de isolamento num Postgres local (PGlite),
// com um "auth" mínimo que imita o do Supabase. Uso: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

const db = new PGlite();
process.on('unhandledRejection', e => { console.error('FALHOU:', e.message, e.where ?? ''); process.exit(1); });
await db.exec(`
  create role authenticated nologin;
  create role anon nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
  $$;
  grant usage on schema auth, public to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`);

for (const f of readdirSync('supabase/migrations').sort()) {
  await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
  console.log('migração aplicada:', f);
}

const res = await db.exec(readFileSync('supabase/tests/isolamento.sql', 'utf8'));
const linha = res.flatMap(r => r.rows).find(r => r.resultado);
if (!linha) { console.error('Teste não chegou ao fim'); process.exit(1); }
console.log(linha.resultado);
