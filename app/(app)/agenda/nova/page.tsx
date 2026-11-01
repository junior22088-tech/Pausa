import Link from 'next/link';
import { CalendarCheck, Package, Sparkles, UserPlus } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { montarEscolha } from '@/lib/agenda-dados';
import { hhmm, paraMin } from '@/lib/agenda-horarios';
import { diaSP, reais } from '@/lib/format';
import { marcarSessao } from '@/lib/actions';
import { Aviso, Avatar, Cartao, Titulo, Vazio, btnPrimario, btnTexto, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';
import { EscolhaHorario } from '@/components/EscolhaHorario';

type Busca = { cliente?: string; servico?: string; dia?: string; hora?: string; fora?: string; erro?: string; trocar?: string };

export default async function NovaSessao({ searchParams }: { searchParams: Promise<Busca> }) {
  const q = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const hoje = diaSP();
  const dia = q.dia && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) && q.dia >= hoje ? q.dia : hoje;

  const { data: clientes } = await supabase.from('clientes').select('id, nome').order('nome');
  if (!clientes?.length) {
    return (
      <div className="space-y-4">
        <Titulo voltar="/agenda" voltarRotulo="Agenda">Marcar sessão</Titulo>
        <Vazio icone={<UserPlus className="size-6" aria-hidden />} titulo="Cadastre um cliente primeiro"
          acao={<Link href="/clientes/novo" className={btnPrimario}>Cadastrar cliente</Link>} />
      </div>
    );
  }

  const cliente = clientes.find((c) => c.id === q.cliente) ?? null;
  // Pacote ativo do cliente: define o serviço sugerido e se a sessão é avulsa.
  const { data: pacote } = cliente
    ? await supabase.from('pacotes_saldo').select('id, saldo, total_sessoes, servico_id').eq('cliente_id', cliente.id)
        .in('situacao', ['aguardando_aceite', 'aceito']).gte('validade_ate', hoje).gt('saldo', 0).order('criado_em').limit(1).maybeSingle()
    : { data: null };

  const { data: listaServicos } = await supabase.from('servicos').select('id, nome, duracao_min, preco_centavos').eq('ativo', true).order('nome');
  const servicos = listaServicos ?? [];
  const servico = servicos.find((s) => s.id === q.servico)
    ?? (!q.servico ? servicos.find((s) => s.id === pacote?.servico_id) ?? (servicos.length === 1 ? servicos[0] : null) : null);

  const base = (p: Partial<Record<keyof Busca, string | null>>) => {
    const u = new URLSearchParams();
    const v: Record<string, string | null | undefined> = { cliente: cliente?.id, servico: servico?.id, dia, hora: q.hora, fora: q.fora, ...p };
    for (const [k, val] of Object.entries(v)) if (val) u.set(k, val);
    return `/agenda/nova?${u.toString()}`;
  };

  // Passo 1: cliente e serviço (formulário simples, sem JavaScript).
  if (q.trocar || !cliente || (!servico && servicos.length > 0)) {
    return (
      <div className="space-y-4">
        <Titulo voltar="/agenda" voltarRotulo="Agenda">Marcar sessão</Titulo>
        <Aviso erro={q.erro} />
        <form method="get" action="/agenda/nova" className="space-y-4">
          <input type="hidden" name="dia" value={dia} />
          <label className="block">
            <span className={rotulo}>Cliente</span>
            <select name="cliente" defaultValue={cliente?.id ?? ''} required className={campo}>
              <option value="" disabled>Escolha o cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          {servicos.length > 0 && (
            <label className="block">
              <span className={rotulo}>Serviço</span>
              <select name="servico" defaultValue={servico?.id ?? pacote?.servico_id ?? ''} required className={campo}>
                <option value="" disabled>Escolha o serviço</option>
                {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.duracao_min} min</option>)}
              </select>
            </label>
          )}
          <button className={`${btnPrimario} w-full`}>Ver horários livres</button>
        </form>
        {servicos.length === 0 && (
          <p className="text-[0.85rem] text-stone-500">Sem serviços cadastrados, as sessões usam 60 min. <Link href="/ajustes/servicos" className="font-semibold text-emerald-800 underline">Cadastrar serviços</Link></p>
        )}
      </div>
    );
  }

  const duracao = servico?.duracao_min ?? 60;
  const escolha = await montarEscolha(supabase, user.id, { dia, duracao });
  const horaValida = q.hora && [...escolha.livres.normais, ...escolha.livres.fora].includes(paraMin(q.hora)) ? q.hora : null;
  const fimAtendimento = horaValida ? hhmm(paraMin(horaValida) + duracao) : null;

  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar="/agenda" voltarRotulo="Agenda">Marcar sessão</Titulo>
      <Aviso erro={q.erro} />

      {/* Quem e o quê */}
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80">
        <Avatar nome={cliente.nome} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{cliente.nome}</p>
          <p className="flex items-center gap-1 truncate text-[0.85rem] text-stone-500">
            {pacote ? <><Package className="size-3.5" aria-hidden />Pacote · resta{pacote.saldo === 1 ? '' : 'm'} {pacote.saldo}</> : <><Sparkles className="size-3.5" aria-hidden />Avulsa</>}
            {servico ? ` · ${servico.nome}` : ' · 60 min'}
          </p>
        </div>
        <Link href={`/agenda/nova?dia=${dia}${cliente ? `&cliente=${cliente.id}` : ''}&trocar=1`} className={btnTexto}>Trocar</Link>
      </div>

      <EscolhaHorario
        semana={escolha.semana} dia={dia} livres={escolha.livres} horaEscolhida={horaValida} foraAberto={q.fora === '1'}
        duracao={duracao} intervalo={escolha.intervalo} anterior={escolha.anterior} proxima={escolha.proxima}
        href={({ dia: d, hora, fora }) => base({ dia: d ?? dia, hora: hora === null ? null : hora ?? q.hora, fora: fora === undefined ? q.fora : fora ? '1' : null })}
      />

      {horaValida && (
        <Cartao className="ring-2 ring-emerald-600">
          <form action={marcarSessao} className="space-y-3">
            <input type="hidden" name="cliente_id" value={cliente.id} />
            {servico && <input type="hidden" name="servico_id" value={servico.id} />}
            <input type="hidden" name="dia" value={dia} />
            <input type="hidden" name="hora" value={horaValida} />
            <p className="text-[0.85rem] font-semibold uppercase tracking-wide text-emerald-800">Confirme</p>
            <p className="text-lg font-bold leading-snug"><span className="first-letter:uppercase inline-block">{escolha.tituloDia}</span>, {horaValida} às {fimAtendimento}</p>
            <p className="text-[0.9rem] text-stone-600">{cliente.nome}{servico ? ` · ${servico.nome}` : ''}{escolha.intervalo ? ` · intervalo até ${hhmm(paraMin(fimAtendimento!) + escolha.intervalo)}` : ''}</p>
            {!pacote && (
              <label className="block">
                <span className={rotulo}>Valor da sessão avulsa</span>
                <input name="valor" inputMode="decimal" defaultValue={servico?.preco_centavos != null ? reais(servico.preco_centavos).replace('R$', '').trim() : ''} placeholder="R$ 120,00" className={campo} />
              </label>
            )}
            <Enviar className={`${btnPrimario} w-full`}><CalendarCheck className="size-5" aria-hidden />Marcar sessão</Enviar>
          </form>
        </Cartao>
      )}
    </div>
  );
}
