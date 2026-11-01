// Criptografia, desbloqueio e leitura do formulário da anamnese. Uso: npm run test:anamnese
import { cifrar, decifrar, chaveDe, novaChave, selarDesbloqueio, desbloqueioValido } from '../lib/cripto.ts';
import { MODELO_PADRAO, lerRespostas, alertas } from '../lib/anamnese-modelo.ts';

let falhas = 0;
const ok = (cond, nome) => { console.log(`${cond ? '✓' : '✗'} ${nome}`); if (!cond) falhas++; };
const falha = (fn) => { try { fn(); return false; } catch { return true; } };

const chave = chaveDe(novaChave());
const outra = chaveDe(novaChave());
ok(chave && chave.length === 32, 'chave nova tem 32 bytes');
ok(chaveDe('curta') === null && chaveDe('') === null && chaveDe(undefined) === null, 'chave inválida é recusada');

const dados = { gestante: { valor: 'sim', detalhe: '20 semanas' } };
const c = cifrar(chave, dados, 'prof1', 'cli1');
ok(c.startsWith('v1:') && !c.includes('gestante') && !c.includes('semanas'), 'texto cifrado não mostra o conteúdo');
ok(cifrar(chave, dados, 'prof1', 'cli1') !== c, 'mesmo conteúdo gera cifra diferente (IV aleatório)');
ok(JSON.stringify(decifrar(chave, c, 'prof1', 'cli1')) === JSON.stringify(dados), 'decifra com a chave certa');
ok(falha(() => decifrar(outra, c, 'prof1', 'cli1')), 'outra chave não abre');
ok(falha(() => decifrar(chave, c, 'prof1', 'cli2')), 'conteúdo copiado para outra cliente não abre');
ok(falha(() => decifrar(chave, c, 'prof2', 'cli1')), 'conteúdo de outra profissional não abre');
const adulterado = c.slice(0, -4) + (c.endsWith('AAAA') ? 'BBBB' : 'AAAA');
ok(falha(() => decifrar(chave, adulterado, 'prof1', 'cli1')), 'conteúdo adulterado é recusado');

const agora = 1_000_000;
const selo = selarDesbloqueio(chave, 'u1', agora + 5 * 60_000);
ok(desbloqueioValido(chave, selo, 'u1', agora), 'desbloqueio vale dentro dos 5 minutos');
ok(!desbloqueioValido(chave, selo, 'u1', agora + 6 * 60_000), 'desbloqueio expira');
ok(!desbloqueioValido(chave, selo, 'u2', agora), 'desbloqueio é de uma pessoa só');
ok(!desbloqueioValido(outra, selo, 'u1', agora), 'selo de outra chave não vale');
ok(!desbloqueioValido(chave, selo.replace(/\.(\d+)\./, (_, n) => `.${Number(n) + 999999}.`), 'u1', agora), 'esticar o prazo invalida o selo');
ok(!desbloqueioValido(chave, undefined, 'u1', agora), 'sem cookie não desbloqueia');

const fd = new Map(Object.entries({
  c_gestante: 'sim', d_gestante: '20 semanas', c_pressao: 'nao', d_pressao: 'ignorado', c_febre: 'talvez',
  c_objetivo: 'Relaxar', c_pressao_toque: 'Fortíssima', c_obs: 'x'.repeat(500), c_inexistente: 'sim',
}));
const r = lerRespostas(MODELO_PADRAO, fd);
ok(r.gestante?.detalhe === '20 semanas', 'sim guarda o detalhe');
ok(r.pressao?.valor === 'nao' && !r.pressao.detalhe, 'não descarta o detalhe');
ok(!r.febre, 'valor fora de sim/não é ignorado');
ok(r.objetivo?.valor === 'Relaxar' && !r.pressao_toque, 'escolha só aceita opções do modelo');
ok(r.obs?.valor.length === 300, 'observação cortada em 300');
ok(!('inexistente' in r), 'campo fora do modelo é ignorado');
ok(alertas(MODELO_PADRAO, r).length === 1 && alertas(MODELO_PADRAO, r)[0].detalhe === '20 semanas', 'alertas listam só os "sim" de cuidado');

if (falhas) { console.error(`FALHOU: ${falhas}`); process.exit(1); }
console.log('\nOK: anamnese (cripto e formulário)');
