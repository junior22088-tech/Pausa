import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { dataCurta, dataPorExtenso, hora, reais, telefoneBonito } from '@/lib/format';
import { anularPagamento } from '@/lib/actions';
import { Cartao, Titulo, btnPrimario, btnSecundario } from '@/components/ui';

const SITUACAO: Record<string, string> = {
  aguardando_aceite: 'Aguardando aceite', aceito: 'Aceito', desistiu: 'Desistiu', encerrado: 'Encerrado',
};

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await carregarProfissional();
  const [{ data: c }, { data: pacotes }, { data: proximas }, { data: pagamentos }, { data: eventos }] = await Promise.all([
    supabase.from('clientes').select('id, nome, telefone').eq('id', id).maybeSingle(),
    supabase.from('pacotes_saldo').select('*').eq('cliente_id', id).order('criado_em', { ascending: false }),
    supabase.from('sessoes').select('id, inicio, situacao').eq('cliente_id', id).eq('situacao', 'marcada').order('inicio').limit(5),
    supabase.from('pagamentos').select('id, valor_centavos, forma, recebido_em, anulado_em').eq('cliente_id', id).order('recebido_em', { ascending: false }).limit(10),
    supabase.from('eventos').select('id, tipo, descricao, criado_em').eq('cliente_id', id).order('criado_em', { ascending: false }).limit(50),
  ]);
  if (!c) notFound();
  const ativo = pacotes?.find((p: any) => ['aguardando_aceite', 'aceito'].includes(p.situacao));

  return (
    <div className="space-y-4">
      <Titulo voltar="/clientes">{c.nome}</Titulo>
      <p className="-mt-3 text-lg text-stone-600">{telefoneBonito(c.telefone)} · <Link href={`/clientes/${id}/editar`} className="text-emerald-800 underline">corrigir</Link></p>

      {ativo ? (
        <Cartao>
          <p className="text-base text-stone-600">Pacote · {SITUACAO[ativo.situacao]} · {ativo.pago ? 'pago' : 'não pago'}</p>
          <p className="text-3xl font-bold">Restam {ativo.saldo} de {ativo.total_sessoes}</p>
          <p className="text-lg">vale até {dataPorExtenso(ativo.validade_ate, false)} · {reais(ativo.valor_centavos)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link href={`/pacotes/${ativo.id}/resumo`} className={btnSecundario}>{ativo.situacao === 'aguardando_aceite' ? 'Aceite' : 'Resumo'}</Link>
            {!ativo.pago && ativo.valor_centavos > 0
              ? <Link href={`/pagamento?pacote=${ativo.id}`} className={btnSecundario}>Recebi</Link>
              : <Link href={`/clientes/${id}/pacote`} className={btnSecundario}>Novo pacote</Link>}
          </div>
        </Cartao>
      ) : (
        <Link href={`/clientes/${id}/pacote`} className={`${btnPrimario} w-full`}>Novo pacote</Link>
      )}

      <Cartao>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Próximas sessões</h2>
          <Link href={`/agenda/nova?cliente=${id}`} className="text-lg font-semibold text-emerald-800">+ Marcar</Link>
        </div>
        {!proximas?.length && <p className="text-base text-stone-500">Nenhuma marcada.</p>}
        <ul>
          {proximas?.map((s) => (
            <li key={s.id}><Link href={`/sessoes/${s.id}`} className="flex min-h-12 items-center text-lg capitalize">{dataPorExtenso(s.inicio)}, {hora(s.inicio)}</Link></li>
          ))}
        </ul>
      </Cartao>

      {!!pagamentos?.length && (
        <Cartao>
          <h2 className="mb-2 text-lg font-bold">Pagamentos</h2>
          <ul className="space-y-2">
            {pagamentos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-lg">
                <span className={p.anulado_em ? 'text-stone-400 line-through' : ''}>{dataCurta(p.recebido_em)} · {reais(p.valor_centavos)} · {p.forma === 'cartao' ? 'Cartão' : p.forma === 'pix' ? 'Pix' : 'Dinheiro'}</span>
                {!p.anulado_em && (
                  <form action={anularPagamento}><input type="hidden" name="id" value={p.id} /><button className="text-base font-semibold text-red-800 underline">Anular</button></form>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Histórico</h2>
        <p className="mb-2 text-base text-stone-500">Tudo o que acontece fica aqui e não é apagado. Correções aparecem como novos registros.</p>
        <ol className="space-y-2">
          {eventos?.map((e) => (
            <li key={e.id} className="text-base"><span className="text-stone-500">{dataCurta(e.criado_em)} {hora(e.criado_em)}</span> · {e.descricao}</li>
          ))}
        </ol>
      </Cartao>
    </div>
  );
}
