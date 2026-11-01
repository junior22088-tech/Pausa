import { carregarProfissional } from '@/lib/dados';
import { hora, telefoneBonito } from '@/lib/format';
import { TelaClientes, type ClienteResumo } from '@/components/telas/Clientes';

// "hoje 15:00", "amanhã 9:00" ou "ter 3/11 9:00": curto para caber numa linha.
function curta(iso: string) {
  const tz = 'America/Sao_Paulo';
  const dia = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
  const alvo = dia(new Date(iso)), hoje = dia(new Date()), amanha = dia(new Date(Date.now() + 864e5));
  const quando = alvo === hoje ? 'hoje' : alvo === amanha ? 'amanhã'
    : new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'numeric' }).format(new Date(iso)).replace(/\./g, '').replace(',', '');
  return `${quando} · ${hora(iso)}`;
}

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase } = await carregarProfissional();
  let query = supabase.from('clientes').select('id, nome, telefone').order('nome');
  if (q) query = query.ilike('nome', `%${q.replace(/[%_]/g, '')}%`);
  const [{ data: clientes }, { data: pacotes }, { data: proximas }] = await Promise.all([
    query,
    supabase.from('pacotes_saldo').select('cliente_id, saldo, total_sessoes, situacao, pago, validade_ate, criado_em')
      .in('situacao', ['aguardando_aceite', 'aceito']).order('criado_em'),
    supabase.from('sessoes').select('cliente_id, inicio').eq('situacao', 'marcada')
      .gte('inicio', new Date().toISOString()).order('inicio'),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const pacotePor = new Map<string, any>();
  for (const p of pacotes ?? []) if (!pacotePor.has(p.cliente_id) && p.validade_ate >= hoje) pacotePor.set(p.cliente_id, p);
  const proximaPor = new Map<string, string>();
  for (const s of proximas ?? []) if (!proximaPor.has(s.cliente_id)) proximaPor.set(s.cliente_id, s.inicio);

  const lista: ClienteResumo[] = (clientes ?? []).map((c) => {
    const p = pacotePor.get(c.id);
    const prox = proximaPor.get(c.id);
    return {
      id: c.id, nome: c.nome, telefone: telefoneBonito(c.telefone),
      pacote: p ? { saldo: p.saldo, total: p.total_sessoes, aguardandoAceite: p.situacao === 'aguardando_aceite', pago: p.pago } : null,
      proxima: prox ? curta(prox) : null,
    };
  });
  return <TelaClientes q={q} clientes={lista} />;
}
