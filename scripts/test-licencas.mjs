// Testa o servidor de licenças (servidor-licencas/*.sql) num Postgres local (PGlite).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
await db.exec(`create role anon; create role authenticated;`);
await db.exec(readFileSync('servidor-licencas/01_licencas.sql', 'utf8'));
const um = async (sql, p = []) => (await db.query(sql, p)).rows[0];
const v = async (chave, dom) => (await um('select public.verificar_licenca($1,$2) r', [chave, dom])).r;
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas++; };

const { emitir: chave } = await um(`select licencas.emitir('Ana@Teste.com', 365, 1) emitir`);
ok(/^PAUSA(-[0-9A-F]{8}){4}$/.test(chave), `formato da chave (${chave.slice(0, 14)}…)`);
ok((await um(`select count(*)::int n from licencas.licencas where hash_chave = licencas.hash($1)`, [chave])).n === 1, 'só o hash fica guardado');
ok((await um(`select count(*)::int n from licencas.licencas where hash_chave like '%PAUSA%'`)).n === 0, 'chave em texto não aparece no banco');

ok((await v('PAUSA-ERRADA', 'cliente.com')).status === 'invalida', 'chave inexistente → invalida');
const local = await v(chave, 'http://localhost:3000');
ok(local.status === 'ativa' && local.dias_restantes === 365, 'localhost funciona e não conta como domínio');
ok((await um(`select count(*)::int n from licencas.ativacoes`)).n === 0, 'localhost não gera ativação');

const r1 = await v(` ${chave.toLowerCase()} `, 'https://Agenda.Clinica.com/login');
ok(r1.status === 'ativa' && r1.dias_restantes === 365, 'primeira ativação: 365 dias (chave em minúsculas e com espaços)');
ok((await um(`select dominio from licencas.ativacoes`)).dominio === 'agenda.clinica.com', 'domínio normalizado');
ok((await v(chave, 'agenda.clinica.com')).status === 'ativa', 'mesmo domínio de novo: continua ativa');
ok((await v(chave, 'outra.com')).status === 'limite_dominios', 'segundo domínio: bloqueado pelo limite');

await db.exec(`update licencas.licencas set expira_em = now() - interval '1 day'`);
ok((await v(chave, 'agenda.clinica.com')).status === 'vencida', 'depois de 1 ano: vencida');
const nova = (await um(`select licencas.renovar($1, 365) r`, [chave.slice(-8)])).r;
ok(new Date(nova) > new Date(Date.now() + 360 * 864e5), 'renovar pelo final da chave: +365 dias');
ok((await v(chave, 'agenda.clinica.com')).status === 'ativa', 'renovada: ativa de novo');

ok((await um(`select licencas.revogar($1, 'reembolso') n`, [chave])).n === 1, 'revogar por reembolso');
ok((await v(chave, 'agenda.clinica.com')).status === 'revogada', 'revogada: bloqueia');
ok((await um(`select licencas.renovar($1, 30) r`, [chave])).r !== null && (await v(chave, 'agenda.clinica.com')).status === 'ativa', 'renovar desfaz a revogação');

// Permissões: anon só chama a função pública.
await db.exec(`set role anon`);
let bloqueado = false;
try { await db.query(`select * from licencas.licencas`); } catch { bloqueado = true; }
ok(bloqueado, 'anon não lê a tabela de licenças');
bloqueado = false;
try { await db.query(`select licencas.emitir('x@y.com')`); } catch { bloqueado = true; }
ok(bloqueado, 'anon não emite chave');
ok((await v(chave, 'agenda.clinica.com')).status === 'ativa', 'anon consegue verificar');
await db.exec(`reset role`);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nOK: servidor de licenças');
process.exit(falhas ? 1 : 0);
