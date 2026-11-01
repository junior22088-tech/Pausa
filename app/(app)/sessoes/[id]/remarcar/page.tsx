import { notFound } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { montarEscolha } from '@/lib/agenda-dados';
import { hhmm, paraMin } from '@/lib/agenda-horarios';
import { dataPorExtenso, diaSP, hora } from '@/lib/format';
import { remarcarSessao } from '@/lib/actions';
import { Aviso, Avatar, Cartao, Titulo, btnPrimario } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { EscolhaHorario } from '@/components/EscolhaHorario';

export default async function Remarcar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ dia?: string; hora?: string; fora?: string; erro?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { data: s } = await supabase.from('sessoes').select('id, inicio, situacao, duracao_min, intervalo_min, clientes(nome), servicos(nome)').eq('id', id).maybeSingle();
  if (!s) notFound();
  const sessao: any = s;
  const hoje = diaSP();
  const diaAtual = diaSP(new Date(sessao.inicio));
  const dia = q.dia && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) && q.dia >= hoje ? q.dia : (diaAtual >= hoje ? diaAtual : hoje);

  const escolha = await montarEscolha(supabase, user.id, { dia, duracao: sessao.duracao_min, intervalo: sessao.intervalo_min, ignorarId: id });
  const horaValida = q.hora && [...escolha.livres.normais, ...escolha.livres.fora].includes(paraMin(q.hora)) ? q.hora : null;
  const href = ({ dia: d, hora: h, fora }: { dia?: string; hora?: string | null; fora?: boolean }) => {
    const u = new URLSearchParams({ dia: d ?? dia });
    const hh = h === null ? null : h ?? q.hora;
    if (hh) u.set('hora', hh);
    if (fora === undefined ? q.fora === '1' : fora) u.set('fora', '1');
    return `/sessoes/${id}/remarcar?${u.toString()}`;
  };

  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar={`/sessoes/${id}`} voltarRotulo="Sessão">Remarcar</Titulo>
      <Aviso erro={q.erro} />

      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80">
        <Avatar nome={sessao.clientes?.nome ?? ''} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{sessao.clientes?.nome}</p>
          <p className="truncate text-[0.85rem] text-stone-500">Hoje marcada: <span className="first-letter:uppercase">{dataPorExtenso(sessao.inicio)}</span>, {hora(sessao.inicio)}</p>
        </div>
      </div>

      <EscolhaHorario
        semana={escolha.semana} dia={dia} livres={escolha.livres} horaEscolhida={horaValida} foraAberto={q.fora === '1'}
        duracao={sessao.duracao_min} intervalo={sessao.intervalo_min} anterior={escolha.anterior} proxima={escolha.proxima} href={href}
      />

      {horaValida && (
        <Cartao className="ring-2 ring-emerald-600">
          <form action={remarcarSessao} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="dia" value={dia} />
            <input type="hidden" name="hora" value={horaValida} />
            <p className="text-[0.85rem] font-semibold uppercase tracking-wide text-emerald-800">Novo horário</p>
            <p className="text-lg font-bold leading-snug"><span className="inline-block first-letter:uppercase">{escolha.tituloDia}</span>, {horaValida} às {hhmm(paraMin(horaValida) + sessao.duracao_min)}</p>
            <p className="text-[0.85rem] text-stone-500">O horário antigo fica no histórico. Depois, avise o cliente pelo botão Lembrar.</p>
            <Enviar className={`${btnPrimario} w-full`}><CalendarClock className="size-5" aria-hidden />Confirmar novo horário</Enviar>
          </form>
        </Cartao>
      )}
    </div>
  );
}
