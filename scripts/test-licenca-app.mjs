// Testa as regras de licença da instalação (lib/licenca-regras.ts) sem rede nem banco.
import { decidir, consultarServidor, REVALIDAR_MS, TOLERANCIA_MS } from '../lib/licenca-regras.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) falhas++; };
const agora = Date.parse('2026-11-01T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
const dia = 864e5;
const dom = 'agenda.clinica.com';
const chave = 'PAUSA-AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD';
const g = (o) => ({ status: 'ativa', expira_em: iso(agora + 200 * dia), dominio: dom, verificado_em: iso(agora - 60_000), ultima_ativa_em: iso(agora - 60_000), ...o });

let e = decidir({ chave: null, dominio: dom, agora, guardado: null, resposta: null, consultou: false });
ok(e.status === 'sem_chave' && !e.podeGravar, 'sem chave → só leitura');

e = decidir({ chave, dominio: dom, agora, guardado: null, resposta: { status: 'ativa', expira_em: iso(agora + 365 * dia) }, consultou: true });
ok(e.status === 'ativa' && e.podeGravar && e.diasRestantes === 365 && !e.aviso, 'servidor diz ativa → grava, sem aviso');
ok(e.finalChave === 'DDDDDDDD', 'mostra só o final da chave');

e = decidir({ chave, dominio: dom, agora, guardado: null, resposta: { status: 'ativa', expira_em: iso(agora + 20 * dia) }, consultou: true });
ok(e.podeGravar && e.aviso === 'Sua licença vence em 20 dias.', 'faltando 20 dias → aviso de vencimento');

for (const s of ['vencida', 'revogada', 'invalida', 'limite_dominios']) {
  e = decidir({ chave, dominio: dom, agora, guardado: null, resposta: { status: s }, consultou: true });
  ok(!e.podeGravar && e.aviso?.includes('só para consulta'), `servidor diz ${s} → só leitura`);
}

e = decidir({ chave, dominio: dom, agora, guardado: g({}), resposta: null, consultou: false });
ok(e.status === 'ativa' && e.podeGravar && !e.offline, 'guardado há 1 min → usa o guardado, sem consultar');

e = decidir({ chave, dominio: dom, agora, guardado: g({ verificado_em: iso(agora - REVALIDAR_MS - 1000), ultima_ativa_em: iso(agora - 2 * dia) }), resposta: null, consultou: true });
ok(e.status === 'ativa' && e.podeGravar && e.offline, 'servidor fora do ar, última ativa há 2 dias → continua gravando');

e = decidir({ chave, dominio: dom, agora, guardado: g({ verificado_em: iso(agora - 8 * dia), ultima_ativa_em: iso(agora - TOLERANCIA_MS - 1000) }), resposta: null, consultou: true });
ok(e.status === 'sem_resposta' && !e.podeGravar, 'servidor fora do ar há mais de 7 dias → só leitura');

e = decidir({ chave, dominio: dom, agora, guardado: g({ expira_em: iso(agora - dia) }), resposta: null, consultou: false });
ok(e.status === 'vencida' && !e.podeGravar, 'guardado ativo mas a data passou → vencida, mesmo sem consultar');

e = decidir({ chave, dominio: dom, agora, guardado: g({ status: 'revogada', verificado_em: iso(agora - 20 * dia) }), resposta: null, consultou: true });
ok(e.status === 'revogada' && !e.podeGravar, 'revogada guardada + servidor fora do ar → continua revogada');

e = decidir({ chave, dominio: 'outro.com', agora, guardado: g({}), resposta: null, consultou: true });
ok(e.status === 'sem_resposta' && !e.podeGravar, 'guardado de outro domínio não vale');

// Chamada HTTP: formato e tolerância a falhas.
let pedido;
const fake = async (url, init) => { pedido = { url, init }; return new Response(JSON.stringify({ status: 'ativa', expira_em: null, dias_restantes: 365 }), { status: 200 }); };
const r = await consultarServidor(chave, dom, { url: 'https://srv.exemplo', chave: 'pub' }, fake);
ok(r?.status === 'ativa', 'consulta devolve o status');
ok(pedido.url === 'https://srv.exemplo/rest/v1/rpc/verificar_licenca' && JSON.parse(pedido.init.body).dominio === dom, 'chama a função pública com chave e domínio');
ok(Object.keys(JSON.parse(pedido.init.body)).sort().join() === 'chave,dominio', 'só chave e domínio saem da instalação');
ok(await consultarServidor(chave, dom, { url: 'x', chave: 'y' }, async () => { throw new Error('rede'); }) === null, 'erro de rede → null (sem derrubar o app)');
ok(await consultarServidor(chave, dom, { url: 'x', chave: 'y' }, async () => new Response('x', { status: 500 })) === null, 'erro 500 → null');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nOK: regras de licença da instalação');
process.exit(falhas ? 1 : 0);
