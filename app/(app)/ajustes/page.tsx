import { carregarProfissional } from '@/lib/dados';
import { linkWhatsApp } from '@/lib/format';
import { salvarAjustes, sair } from '@/lib/actions';
import { Aviso, Cartao, Titulo, btnPerigo, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string }> }) {
  const { erro, salvo } = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { data: p } = await supabase.from('profissionais').select('*').eq('id', user.id).single();
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP;

  return (
    <div className="space-y-5">
      <Titulo>Ajustes</Titulo>
      <Aviso erro={erro} ok={salvo ? 'Salvo.' : undefined} />
      <form action={salvarAjustes} className="space-y-4">
        <label className="block"><span className={rotulo}>Seu nome nas mensagens</span><input name="nome_mensagem" defaultValue={p?.nome_mensagem} required placeholder="Ex.: Marta Souza" className={campo} /></label>
        <label className="block"><span className={rotulo}>Especialidade no cabeçalho (opcional)</span><input name="especialidade" defaultValue={p?.especialidade ?? ''} placeholder="Ex.: massoterapia" className={campo} /></label>
        <label className="block"><span className={rotulo}>Endereço no lembrete (opcional)</span><input name="endereco" defaultValue={p?.endereco ?? ''} className={campo} /></label>
        <label className="block"><span className={rotulo}>Regra de cancelamento dos pacotes</span><textarea name="regra_cancelamento" defaultValue={p?.regra_cancelamento} rows={4} required className={`${campo} py-2`} /></label>
        <button className={`${btnPrimario} w-full`}>Salvar</button>
      </form>

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Seus dados</h2>
        <p className="mb-3 text-base text-stone-600">Para exportar ou apagar os dados de um cliente, ou a sua conta, fale com o suporte. No piloto isso é feito por uma pessoa.</p>
        {suporte
          ? <a href={linkWhatsApp(suporte, 'Olá! Quero pedir exportação ou exclusão de dados no Pausa.')} className={`${btnSecundario} w-full`}>Pedir exportação ou exclusão</a>
          : <p className="text-base text-stone-500">Suporte ainda não configurado.</p>}
      </Cartao>

      <p className="text-base text-stone-500">Conectado como {user.email}</p>
      <form action={sair}><button className={`${btnPerigo} w-full`}>Sair de todos os aparelhos</button></form>
    </div>
  );
}
