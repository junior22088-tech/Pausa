import { TelaHorarios } from '@/components/telas/Horarios';
import { carregarProfissional } from '@/lib/dados';
import { configAgenda } from '@/lib/agenda-dados';
import { salvarHorarios } from '@/lib/actions';
import { Aviso, Cartao, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { SeletorHora } from '@/components/SeletorHora';

const DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const INTERVALOS = [0, 5, 10, 15, 20, 30, 45, 60];

export default async function Horarios({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { semana, intervalo } = await configAgenda(supabase, user.id);
  const cfg = (d: number) => semana.find((s) => s.dia_semana === d) ?? { dia_semana: d, atende: false, inicio_min: 540, fim_min: 1080, almoco_inicio_min: null, almoco_fim_min: null };

  return <TelaHorarios cfg={cfg} intervalo={intervalo} erro={erro} />;
}
