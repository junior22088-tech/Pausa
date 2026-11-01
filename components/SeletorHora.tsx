import { hhmm } from '@/lib/agenda-horarios';
import { campo } from '@/components/ui';

/** Seleção de hora de 15 em 15 minutos (sem digitar). */
export function SeletorHora({ nome, valor, de = 0, ate = 24 * 60, rotulo, desativado = false }: { nome: string; valor: number; de?: number; ate?: number; rotulo: string; desativado?: boolean }) {
  const opcoes: number[] = [];
  for (let t = de; t <= Math.min(ate, 1439); t += 15) opcoes.push(t);
  if (ate === 24 * 60) opcoes.push(1440 - 1); // 23:59 como "fim do dia"
  return (
    <select name={nome} defaultValue={hhmm(valor >= 1440 ? 1439 : valor)} aria-label={rotulo} disabled={desativado} className={`${campo} appearance-none pr-3 tabular-nums`}>
      {opcoes.map((t) => <option key={t} value={hhmm(t)}>{hhmm(t)}</option>)}
    </select>
  );
}
