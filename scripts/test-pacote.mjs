// Regras de montar/editar pacote. Uso: npm run test:pacote
import { planejarItens, pagoAposEdicao } from '../lib/pacote-regras.ts';

let falhas = 0;
const ok = (cond, nome) => { console.log(`${cond ? '✓' : '✗'} ${nome}`); if (!cond) falhas++; };

const servicos = [
  { id: 's1', nome: 'Massagem relaxante', duracao_min: 60, preco_centavos: 12000 },
  { id: 's2', nome: 'Drenagem linfática', duracao_min: 50, preco_centavos: 11000 },
];

let p = planejarItens([{ servico_id: 's1', nome: 'falso', duracao_min: 999, quantidade: 6 }, { nome: ' Avaliação ', duracao_min: 30, quantidade: 1 }], servicos, null);
ok(p.ok && p.total === 7, 'novo pacote: 6 + 1 = 7 sessões');
ok(p.ok && p.itens[0].nome === 'Massagem relaxante' && p.itens[0].duracao_min === 60 && p.itens[0].preco_unit_centavos === 12000, 'item de serviço usa o cadastro, não o navegador');
ok(p.ok && p.itens[1].nome === 'Avaliação' && p.itens[1].servico_id === null, 'item manual com nome limpo');
ok(p.ok && p.itens[1].ordem === 1, 'ordem segue a lista');

ok(!planejarItens([], servicos, null).ok, 'pacote vazio é recusado');
ok(!planejarItens([{ nome: '', duracao_min: 60, quantidade: 1 }], servicos, null).ok, 'item manual sem nome é recusado');
ok(!planejarItens([{ servico_id: 'sx', quantidade: 1 }], servicos, null).ok, 'serviço inexistente é recusado');
ok(!planejarItens([{ servico_id: 's1', quantidade: 0 }], servicos, null).ok, 'quantidade 0 é recusada');
ok(!planejarItens([{ servico_id: 's1', quantidade: 60 }, { servico_id: 's2', quantidade: 50 }], servicos, null).ok, 'mais de 100 sessões no total é recusado');
ok(!planejarItens([{ nome: 'x', duracao_min: 5, quantidade: 1 }], servicos, null).ok, 'duração abaixo de 10 min é recusada');

const atuais = [
  { id: 'i1', nome: 'Massagem relaxante', usadas: 2, temSessaoAtiva: true },
  { id: 'i2', nome: 'Drenagem linfática', usadas: 0, temSessaoAtiva: false },
];
p = planejarItens([{ id: 'i1', servico_id: 's1', quantidade: 1 }, { id: 'i2', servico_id: 's2', quantidade: 3 }], servicos, atuais);
ok(!p.ok && p.erro.includes('2 sessões usadas'), 'edição: não baixa abaixo do usado');
p = planejarItens([{ id: 'i2', servico_id: 's2', quantidade: 3 }], servicos, atuais);
ok(!p.ok && p.erro.includes('Massagem'), 'edição: não retira item com sessões');
p = planejarItens([{ id: 'i1', servico_id: 's1', quantidade: 5 }, { nome: 'Pedras', duracao_min: 90, quantidade: 1 }], servicos, atuais);
ok(p.ok && p.remover.length === 1 && p.remover[0] === 'i2' && p.total === 6, 'edição: retira item sem sessões e inclui novo');
p = planejarItens([{ id: 'outro', servico_id: 's1', quantidade: 5 }], servicos, atuais);
ok(!p.ok, 'edição: item de outro pacote é recusado');
p = planejarItens([{ id: 'i1', servico_id: 's1', quantidade: 5 }, { id: 'i1', servico_id: 's1', quantidade: 5 }], servicos, atuais);
ok(!p.ok, 'edição: item repetido é recusado');

ok(pagoAposEdicao(true, 90000, 90000, 50000) === true, 'pago: valor igual mantém');
ok(pagoAposEdicao(true, 90000, 100000, 90000) === false, 'pago: valor maior que o recebido vira a pagar');
ok(pagoAposEdicao(false, 90000, 80000, 90000) === true, 'pago: valor menor que o recebido vira pago');

if (falhas) { console.error(`FALHOU: ${falhas} regra(s)`); process.exit(1); }
console.log('\nOK: regras de pacote');
