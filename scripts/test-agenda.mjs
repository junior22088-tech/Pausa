// Testa o cálculo de horários livres (lib/agenda-horarios.ts).
import { horariosLivres, conflito, proximosLivres, diaDaSemana, minutosSP, hhmm, bloqueiosDoDia, espacosLivres } from '../lib/agenda-horarios.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) falhas++; };
const H = (s) => s.split(',').map((x) => x.trim());
const lista = (arr) => arr.map(hhmm);

const semana = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dia_semana: d, atende: d >= 1 && d <= 5, inicio_min: 540, fim_min: 1080,
  almoco_inicio_min: d >= 1 && d <= 5 ? 720 : null, almoco_fim_min: d >= 1 && d <= 5 ? 780 : null,
}));
const seg = '2030-01-07'; // segunda-feira
ok(diaDaSemana(seg) === 1, 'segunda-feira identificada');
ok(minutosSP('2030-01-07T12:00:00Z') === 540, 'instante UTC → 09:00 em São Paulo');

let r = horariosLivres({ dia: seg, duracao: 60, intervalo: 15, semana, bloqueios: [], ocupados: [] });
ok(r.normais[0] === 540 && r.normais.every((t) => t % 15 === 0), 'começa às 09:00, de 15 em 15');
ok(!lista(r.normais).includes('11:15') && lista(r.normais).includes('11:00'), '11:00 cabe antes do almoço; 11:15 invade o almoço');
ok(!lista(r.normais).some((h) => h >= '12:00' && h < '13:00'), 'nada começa no almoço');
ok(lista(r.normais).includes('13:00') && lista(r.normais).at(-1) === '17:00', 'volta 13:00; último às 17:00 (termina 18:00)');

const ocupados = [{ id: 's1', inicio: 600, fim: 600 + 75, nome: 'Carla' }]; // 10:00 + 60 + 15 = até 11:15
r = horariosLivres({ dia: seg, duracao: 60, intervalo: 15, semana, bloqueios: [], ocupados });
ok(!lista(r.normais).includes('09:00'), '09:00 não cabe: 09:00+60+15 = 10:15 invade a sessão das 10:00');
ok(lista(r.normais).includes('08:45') === false && lista(r.normais)[0] === '11:15' || !lista(r.normais).includes('09:00'), 'antes das 10:00 não há espaço para 60+15 min');
ok(!lista(r.normais).includes('10:30') && !lista(r.normais).includes('11:00'), 'nada durante a sessão nem no intervalo');
ok(conflito(ocupados, 645, 60, 15)?.nome === 'Carla', 'conflito aponta quem ocupa (10:45)');
ok(conflito(ocupados, 675, 60, 15) === null, '11:15 já está livre');
ok(conflito(ocupados, 600, 60, 15, 's1') === null, 'ao remarcar, a própria sessão não conta como conflito');

r = horariosLivres({ dia: seg, duracao: 30, intervalo: 0, semana, bloqueios: [], ocupados: [] , agoraMin: 900 });
ok(r.normais[0] === 915, 'hoje às 15:00: horários começam depois de agora (15:15)');
r = horariosLivres({ dia: seg, duracao: 30, intervalo: 0, semana, bloqueios: [], ocupados: [], agoraMin: 1100 });
ok(r.normais.length === 0 && r.motivo === 'passado', 'expediente já acabou → motivo "passado"');

const folga = [{ data_inicio: '2030-01-06', data_fim: '2030-01-10', dia_inteiro: true, inicio_min: null, fim_min: null, motivo: 'Férias' }];
r = horariosLivres({ dia: seg, duracao: 60, intervalo: 15, semana, bloqueios: folga, ocupados: [] });
ok(r.normais.length === 0 && r.fora.length === 0 && r.motivo === 'folga' && r.folga?.motivo === 'Férias', 'período de férias bloqueia o dia inteiro');
ok(bloqueiosDoDia('2030-01-11', folga).folgaDiaInteiro === null, 'dia seguinte ao fim das férias está livre');

const trecho = [{ data_inicio: seg, data_fim: seg, dia_inteiro: false, inicio_min: 840, fim_min: 960 }]; // 14h–16h
r = horariosLivres({ dia: seg, duracao: 60, intervalo: 0, semana, bloqueios: trecho, ocupados: [] });
ok(!lista(r.normais).some((h) => h > '13:00' && h < '16:00') && lista(r.normais).includes('13:00') && lista(r.normais).includes('16:00'), 'bloqueio 14h–16h: 13:00 e 16:00 podem, entre eles não');

r = horariosLivres({ dia: '2030-01-12', duracao: 60, intervalo: 15, semana, bloqueios: [], ocupados: [] }); // sábado
ok(r.normais.length === 0 && r.motivo === 'nao_atende' && r.fora[0] === 360 && lista(r.fora).at(-1) === '21:00', 'sábado sem atendimento: fora do expediente das 06:00 às 21:00');

r = horariosLivres({ dia: seg, duracao: 60, intervalo: 15, semana, bloqueios: [], ocupados });
ok(lista(r.fora).includes('08:00') && lista(r.fora).includes('18:00') && lista(r.fora).includes('12:00'), 'fora do expediente: antes das 9h, depois das 18h e no almoço');
ok(!lista(r.fora).includes('09:15') && !lista(r.fora).includes('10:00'), 'fora do expediente nunca mostra horário em conflito');
ok(r.fora.every((t) => !r.normais.includes(t)), 'listas não se repetem');
ok(lista(proximosLivres(r, 600)).join() === '11:15,11:30,11:45', 'sugestões após conflito: os próximos 3 livres');

const esp = (o) => espacosLivres({ dia: seg, semana, bloqueios: [], ocupados: [], ...o }).map(([a, b]) => `${hhmm(a)}-${hhmm(b)}`).join(' ');
ok(esp({}) === '09:00-12:00 13:00-18:00', 'espaços livres de um dia vazio: manhã e tarde, sem o almoço');
ok(esp({ ocupados }) === '09:00-10:00 11:15-12:00 13:00-18:00', 'espaços livres descontam sessão + intervalo');
ok(esp({ bloqueios: trecho }) === '09:00-12:00 13:00-14:00 16:00-18:00', 'espaços livres descontam bloqueio de parte do dia');
ok(esp({ agoraMin: 905 }) === '15:15-18:00', 'hoje: espaços livres só a partir de agora (arredondado a 15 min)');
ok(espacosLivres({ dia: seg, semana, bloqueios: folga, ocupados: [] }).length === 0, 'folga do dia inteiro: sem espaços');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nOK: horários livres');
process.exit(falhas ? 1 : 0);
