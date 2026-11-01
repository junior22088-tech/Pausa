import { TelaServicos } from '@/components/telas/Servicos';
import Link from 'next/link';
import { Clock, Plus, Sparkles } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { configAgenda } from '@/lib/agenda-dados';
import { reais } from '@/lib/format';
import { desativarServico, salvarServico } from '@/lib/actions';
import { Aviso, Cartao, Titulo, Vazio, btnPerigo, btnPequeno, btnPrimario, btnSecundario, btnTexto, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

const DURACOES = [15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180];
const centavosParaCampo = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));

export default async function Servicos({ searchParams }: { searchParams: Promise<{ erro?: string; novo?: string; editar?: string }> }) {
  const { erro, novo, editar } = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { servicos, intervalo } = await configAgenda(supabase, user.id);
  const ativos = servicos.filter((s) => s.ativo);
  const emEdicao = ativos.find((s) => s.id === editar) ?? null;
  const mostrarForm = !!novo || !!emEdicao || ativos.length === 0;

  return <TelaServicos ativos={ativos} emEdicao={emEdicao} mostrarForm={mostrarForm} novo={novo} intervalo={intervalo} erro={erro} />;
}
