import Link from 'next/link';
import { carregarProfissional } from '@/lib/dados';
import { diaSP, inicioDoDia, somarDias, hora, linkWhatsApp, msgLembrete, reais } from '@/lib/format';
import { registrarWhatsApp, sessaoFeita } from '@/lib/actions';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Aviso, Cartao, btnPrimario, btnSecundario } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function Hoje({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { supabase, prof } = await carregarProfissional();
  const hoje = diaSP();
  const amanha = somarDias(hoje, 1);

  const [{ data: sessoes }, { data: aguardando }, { data: pacotesNaoPagos }, { data: avulsasNaoPagas }] = await Promise.all([
    supabase.from('sessoes').select('id, inicio, situacao, pacote_id, lembrete_aberto_em, clientes(nome, telefone)')
      .gte('inicio', inicioDoDia(hoje).toISOString()).lt('inicio', inicioDoDia(amanha).toISOString())
      .neq('situacao', 'cancelada').order('inicio'),
    supabase.from('pacotes').select('id, clientes(nome)').eq('situacao', 'aguardando_aceite').order('criado_em'),
    supabase.from('pacotes').select('id, valor_centavos, clientes(nome)').eq('pago', false).gt('valor_centavos', 0)
      .in('situacao', ['aguardando_aceite', 'aceito']),
    supabase.from('sessoes').select('id, valor_avulso_centavos, clientes(nome)').is('pacote_id', null)
      .eq('situacao', 'feita').eq('pago', false),
  ]);

  const pendencias = (aguardando?.length ?? 0) + (pacotesNaoPagos?.length ?? 0) + (avulsasNaoPagas?.length ?? 0);

  return (
    <div className="space-y-5">
      <Aviso erro={erro} />
      {!prof.configurado && (
        <Link href="/ajustes" className="block rounded-xl bg-amber-50 p-3 text-lg text-amber-900">
          Antes de enviar mensagens, diga como seu nome aparece para os clientes. <u>Abrir Ajustes</u>
        </Link>
      )}

      {pendencias > 0 && (
        <section aria-label="Pendências" className="space-y-2">
          {aguardando?.map((p: any) => (
            <Link key={p.id} href={`/pacotes/${p.id}/resumo`} className="block rounded-xl bg-amber-50 p-3 text-lg font-semibold text-amber-900">
              Aguardando aceite: {p.clientes?.nome} ›
            </Link>
          ))}
          {pacotesNaoPagos?.map((p: any) => (
            <Link key={p.id} href={`/pagamento?pacote=${p.id}`} className="block rounded-xl bg-red-50 p-3 text-lg font-semibold text-red-900">
              Não pago: {p.clientes?.nome} · pacote {reais(p.valor_centavos)} ›
            </Link>
          ))}
          {avulsasNaoPagas?.map((s: any) => (
            <Link key={s.id} href={`/pagamento?sessao=${s.id}`} className="block rounded-xl bg-red-50 p-3 text-lg font-semibold text-red-900">
              Não pago: {s.clientes?.nome} · sessão avulsa {s.valor_avulso_centavos ? reais(s.valor_avulso_centavos) : ''} ›
            </Link>
          ))}
        </section>
      )}

      <section aria-label="Sessões de hoje" className="space-y-3">
        <h1 className="text-2xl font-bold">Hoje</h1>
        {!sessoes?.length && (
          <Cartao>
            <p className="mb-3 text-lg text-stone-600">Nenhuma sessão hoje.</p>
            <Link href={`/agenda/nova?dia=${hoje}`} className={btnPrimario}>Marcar sessão</Link>
          </Cartao>
        )}
        {sessoes?.map((s: any) => (
          <Cartao key={s.id}>
            <Link href={`/sessoes/${s.id}`} className="block">
              <p className="text-3xl font-bold">{hora(s.inicio)}</p>
              <p className="text-xl font-semibold">{s.clientes?.nome}</p>
              <p className="text-base text-stone-600">
                {s.situacao === 'feita' ? 'Feita ✓' : s.pacote_id ? 'Pacote' : 'Avulsa'}
                {s.lembrete_aberto_em && s.situacao !== 'feita' ? ' · lembrete aberto no WhatsApp' : ''}
              </p>
            </Link>
            {s.situacao === 'marcada' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <form action={sessaoFeita}>
                  <input type="hidden" name="id" value={s.id} />
                  <Enviar className={`${btnPrimario} w-full`}>Feita</Enviar>
                </form>
                <WhatsAppButton
                  className={`${btnSecundario} w-full`}
                  href={linkWhatsApp(s.clientes.telefone, msgLembrete(prof, s.clientes.nome, s.inicio, 'com antecedência'))}
                  registrar={registrarWhatsApp.bind(null, s.id, 'lembrete')}
                >
                  Lembrar
                </WhatsAppButton>
              </div>
            )}
          </Cartao>
        ))}
      </section>
    </div>
  );
}
