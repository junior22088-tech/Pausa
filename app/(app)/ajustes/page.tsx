import { carregarProfissional } from '@/lib/dados';
import { linkWhatsApp } from '@/lib/format';
import { definirSenha, salvarAjustes, sair } from '@/lib/actions';
import { Aviso, Cartao, Titulo, btnPerigo, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string; senha?: string }> }) {
  const { erro, salvo, senha } = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { data: p } = await supabase.from('profissionais').select('*').eq('id', user.id).single();
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP;

  return (
    <div className="space-y-5">
      <Titulo>Ajustes</Titulo>
      <Aviso erro={erro} ok={senha ? 'Senha salva. Da próxima vez, entre com e-mail e senha.' : salvo ? 'Salvo.' : undefined} />
      <form action={salvarAjustes} className="space-y-4">
        <label className="block"><span className={rotulo}>Seu nome nas mensagens</span><input name="nome_mensagem" defaultValue={p?.nome_mensagem} required placeholder="Ex.: Marta Souza" className={campo} /></label>
        <label className="block"><span className={rotulo}>Especialidade no cabeçalho (opcional)</span><input name="especialidade" defaultValue={p?.especialidade ?? ''} placeholder="Ex.: massoterapia" className={campo} /></label>
        <label className="block"><span className={rotulo}>Endereço no lembrete (opcional)</span><input name="endereco" defaultValue={p?.endereco ?? ''} className={campo} /></label>
        <label className="block"><span className={rotulo}>Regra de cancelamento dos pacotes</span><textarea name="regra_cancelamento" defaultValue={p?.regra_cancelamento} rows={4} required className={`${campo} py-2`} /></label>
        <Enviar className={`${btnPrimario} w-full`}>Salvar</Enviar>
      </form>

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Seus dados</h2>
        <p className="mb-3 text-base text-stone-600">Para exportar ou apagar os dados de um cliente, ou a sua conta, fale com o suporte. No piloto isso é feito por uma pessoa.</p>
        {suporte
          ? <a href={linkWhatsApp(suporte, 'Olá! Quero pedir exportação ou exclusão de dados no Pausa.')} className={`${btnSecundario} w-full`}>Pedir exportação ou exclusão</a>
          : <p className="text-base text-stone-500">Suporte ainda não configurado.</p>}
      </Cartao>

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Senha</h2>
        <form action={definirSenha} className="space-y-3">
          <label className="block"><span className={rotulo}>Nova senha (mínimo 8 caracteres)</span><input type="password" name="senha" autoComplete="new-password" minLength={8} required className={campo} /></label>
          <Enviar className={`${btnSecundario} w-full`}>Salvar senha</Enviar>
        </form>
      </Cartao>

      <p className="text-base text-stone-500">Conectado como {user.email}</p>
      <form action={sair}><Enviar className={`${btnPerigo} w-full`}>Sair de todos os aparelhos</Enviar></form>
    </div>
  );
}
