import Link from 'next/link';
import { CalendarCheck, Package, Sparkles, UserPlus } from 'lucide-react';
import { carregarProfissional } from '@/lib/dados';
import { montarEscolha } from '@/lib/agenda-dados';
import { hhmm, paraMin } from '@/lib/agenda-horarios';
import { diaSP, reais } from '@/lib/format';
import { marcarSessao } from '@/lib/actions';
import { pacoteEmUso, resolverEscolha } from '@/lib/pacotes';
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
  // Pacote em uso do cliente: os serviços dele aparecem primeiro, com o saldo de cada um.
  const pacote = cliente ? await pacoteEmUso(supabase, cliente.id) : null;
  const itensComSaldo = (pacote?.itens ?? []).filter((i) => i.saldo > 0);

  const { data: listaServicos } = await supabase.from('servicos').select('id, nome, duracao_min, preco_centavos').eq('ativo', true).order('nome');
  const servicos = listaServicos ?? [];
  const escolha = resolverEscolha(q.servico, pacote, servicos);
  const temOpcoes = servicos.length > 0 || itensComSaldo.length > 0;

  const base = (p: Partial<Record<keyof Busca, string | null>>) => {
    const u = new URLSearchParams();
    const v: Record<string, string | null | undefined> = { cliente: cliente?.id, servico: escolha?.valor, dia, hora: q.hora, fora: q.fora, ...p };
    for (const [k, val] of Object.entries(v)) if (val) u.set(k, val);
    return `/agenda/nova?${u.toString()}`;
  };

  // Passo 1: cliente e serviço (formulário simples, sem JavaScript).
  if (q.trocar || !cliente || (!escolha && temOpcoes)) {
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
          {temOpcoes && (
            <label className="block">
              <span className={rotulo}>Serviço</span>
              <select name="servico" defaultValue={escolha?.valor ?? ''} required className={campo}>
                <option value="" disabled>Escolha o serviço</option>
                {itensComSaldo.length > 0 && (
                  <optgroup label="Do pacote">
                    {itensComSaldo.map((i) => <option key={i.id} value={`item:${i.id}`}>{i.nome} · {i.duracao_min} min · resta{i.saldo === 1 ? '' : 'm'} {i.saldo}</option>)}
                  </optgroup>
                )}
                {servicos.length > 0 && (
                  <optgroup label={itensComSaldo.length ? 'Avulsa' : 'Serviços'}>
                    {servicos.filter((s) => !itensComSaldo.some((i) => i.servico_id === s.id)).map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.duracao_min} min</option>)}
                  </optgroup>
                )}
              </select>
              {cliente && !pacote && <span className="mt-1 block text-[0.8rem] text-stone-500">Sem pacote em uso: a sessão fica avulsa.</span>}
            </label>
          )}
          <button className={`${btnPrimario} w-full`}>Ver horários livres</button>
        </form>
        {!temOpcoes && (
          <p className="text-[0.85rem] text-stone-500">Sem serviços cadastrados, as sessões usam 60 min. <Link href="/ajustes/servicos" className="font-semibold text-emerald-800 underline">Cadastrar serviços</Link></p>
        )}
      </div>
    );
  }

  const duracao = escolha?.duracao ?? 60;
  const grade = await montarEscolha(supabase, user.id, { dia, duracao });
  const horaValida = q.hora && [...grade.livres.normais, ...grade.livres.fora].includes(paraMin(q.hora)) ? q.hora : null;
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
            {escolha?.pacoteId
              ? <><Package className="size-3.5" aria-hidden />Pacote · resta{escolha.saldoItem === 1 ? '' : 'm'} {escolha.saldoItem}</>
              : <><Sparkles className="size-3.5" aria-hidden />Avulsa</>}
            {escolha ? ` · ${escolha.nome}` : ' · 60 min'}
          </p>
        </div>
        <Link href={`/agenda/nova?dia=${dia}${cliente ? `&cliente=${cliente.id}` : ''}&trocar=1`} className={btnTexto}>Trocar</Link>
      </div>

      <EscolhaHorario
        semana={grade.semana} dia={dia} livres={grade.livres} horaEscolhida={horaValida} foraAberto={q.fora === '1'}
        duracao={duracao} intervalo={grade.intervalo} anterior={grade.anterior} proxima={grade.proxima}
        href={({ dia: d, hora, fora }) => base({ dia: d ?? dia, hora: hora === null ? null : hora ?? q.hora, fora: fora === undefined ? q.fora : fora ? '1' : null })}
      />

      {horaValida && (
        <Cartao className="ring-2 ring-emerald-600">
          <form action={marcarSessao} className="space-y-3">
            <input type="hidden" name="cliente_id" value={cliente.id} />
            {escolha && <input type="hidden" name="escolha" value={escolha.valor} />}
            <input type="hidden" name="dia" value={dia} />
            <input type="hidden" name="hora" value={horaValida} />
            <p className="text-[0.85rem] font-semibold uppercase tracking-wide text-emerald-800">Confirme</p>
            <p className="text-lg font-bold leading-snug"><span className="first-letter:uppercase inline-block">{grade.tituloDia}</span>, {horaValida} às {fimAtendimento}</p>
            <p className="text-[0.9rem] text-stone-600">{cliente.nome}{escolha ? ` · ${escolha.nome}` : ''}{escolha?.pacoteId ? ' · pacote' : ''}{grade.intervalo ? ` · intervalo até ${hhmm(paraMin(fimAtendimento!) + grade.intervalo)}` : ''}</p>
            {!escolha?.pacoteId && (
              <label className="block">
                <span className={rotulo}>Valor da sessão avulsa</span>
                <input name="valor" inputMode="decimal" defaultValue={escolha?.precoAvulso != null ? reais(escolha.precoAvulso).replace('R$', '').trim() : ''} placeholder="R$ 120,00" className={campo} />
              </label>
            )}
            <Enviar className={`${btnPrimario} w-full`}><CalendarCheck className="size-5" aria-hidden />Marcar sessão</Enviar>
          </form>
        </Cartao>
      )}
    </div>
  );
}
