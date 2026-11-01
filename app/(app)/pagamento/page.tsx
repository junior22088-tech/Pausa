import { carregarProfissional } from '@/lib/dados';
import { reais } from '@/lib/format';
import { registrarPagamento } from '@/lib/actions';
import { Aviso, Titulo, btnPrimario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function Pagamento({ searchParams }: { searchParams: Promise<{ pacote?: string; sessao?: string; erro?: string }> }) {
  const { pacote, sessao, erro } = await searchParams;
  const { supabase } = await carregarProfissional();
  let nome = '', valor = 0, descricao = '';
  if (pacote) {
    const { data } = await supabase.from('pacotes').select('valor_centavos, total_sessoes, clientes(nome)').eq('id', pacote).maybeSingle();
    nome = (data?.clientes as any)?.nome ?? ''; valor = data?.valor_centavos ?? 0; descricao = `pacote de ${data?.total_sessoes} sessões`;
  } else if (sessao) {
    const { data } = await supabase.from('sessoes').select('valor_avulso_centavos, clientes(nome)').eq('id', sessao).maybeSingle();
    nome = (data?.clientes as any)?.nome ?? ''; valor = data?.valor_avulso_centavos ?? 0; descricao = 'sessão avulsa';
  }
  const valorTexto = valor ? reais(valor).replace(/\s/g, ' ') : '';

  return (
    <div className="space-y-4">
      <Titulo voltar="/">Recebi</Titulo>
      <Aviso erro={erro} />
      <p className="text-lg">{nome} · {descricao}</p>
      <form action={registrarPagamento} className="space-y-4">
        {pacote && <input type="hidden" name="pacote_id" value={pacote} />}
        {sessao && <input type="hidden" name="sessao_id" value={sessao} />}
        <input type="hidden" name="voltar" value="/" />
        <label className="block">
          <span className={rotulo}>Valor</span>
          <input name="valor" defaultValue={valorTexto} required inputMode="decimal" className={campo} />
        </label>
        <p className={rotulo}>Como recebeu?</p>
        <div className="grid grid-cols-3 gap-2">
          {[['pix', 'Pix'], ['cartao', 'Cartão'], ['dinheiro', 'Dinheiro']].map(([v, r]) => (
            <Enviar key={v} name="forma" value={v} className={btnPrimario}>{r}</Enviar>
          ))}
        </div>
      </form>
      <p className="text-base text-stone-500">O dinheiro vai direto para você. O Pausa só anota. Se errar, anule na ficha do cliente.</p>
    </div>
  );
}
