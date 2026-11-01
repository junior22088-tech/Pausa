import { TelaFolgas } from '@/components/telas/Folgas';
import Link from 'next/link';
import { AlertTriangle, CalendarOff, CalendarPlus, MessageCircle, Plus } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { configAgenda } from '@/lib/agenda-dados';
import { hhmm, minutosSP } from '@/lib/agenda-horarios';
import { dataPorExtenso, diaSP, hora, inicioDoDia, linkWhatsApp, msgRemarcarPorFolga, somarDias } from '@/lib/format';
import { criarBloqueio, registrarWhatsApp, removerBloqueio } from '@/lib/actions';
import { Aviso, Cartao, Chip, Titulo, Vazio, btnPequeno, btnPerigo, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { SeletorHora } from '@/components/SeletorHora';
import { WhatsAppButton } from '@/components/WhatsAppButton';

const ddmm = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

export default async function Folgas({ searchParams }: { searchParams: Promise<{ erro?: string; nova?: string; ver?: string }> }) {
  const { erro, nova, ver } = await searchParams;
  const { supabase, user, prof } = await carregarProfissional();
  const { bloqueios } = await configAgenda(supabase, user.id);
  const hoje = diaSP();
  const futuros = bloqueios.filter((b) => b.data_fim >= hoje);

  // Sessões marcadas que caem dentro de alguma folga.
  let afetadas: any[] = [];
  if (futuros.length) {
    const de = futuros.reduce((m, b) => (b.data_inicio < m ? b.data_inicio : m), futuros[0].data_inicio);
    const ate = futuros.reduce((m, b) => (b.data_fim > m ? b.data_fim : m), futuros[0].data_fim);
    const { data } = await supabase.from('sessoes').select('id, inicio, duracao_min, clientes(nome, telefone)')
      .eq('situacao', 'marcada').gte('inicio', inicioDoDia(de < hoje ? hoje : de).toISOString()).lt('inicio', inicioDoDia(somarDias(ate, 1)).toISOString()).order('inicio');
    afetadas = data ?? [];
  }
  const afetadasPor = (b: (typeof futuros)[number]) => afetadas.filter((s) => {
    const d = diaSP(new Date(s.inicio));
    if (d < b.data_inicio || d > b.data_fim) return false;
    if (b.dia_inteiro) return true;
    const ini = minutosSP(s.inicio);
    return ini < b.fim_min! && b.inicio_min! < ini + s.duracao_min;
  });
  const mostrarForm = !!nova || futuros.length === 0;

  return <TelaFolgas futuros={futuros} afetadasPor={afetadasPor} prof={prof} hoje={hoje} mostrarForm={mostrarForm} nova={nova} ver={ver} erro={erro} />;
}
