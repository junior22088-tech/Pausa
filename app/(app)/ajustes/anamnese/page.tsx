import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { requireUser } from '@/lib/supabase/server';
import { chaveAnamnese, novaChave } from '@/lib/cripto';
import { Cartao, Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AtivarAnamnese() {
  await requireUser();
  const ativa = !!chaveAnamnese();
  // Chave sugerida, gerada agora no servidor desta instalação. Só aparece enquanto a anamnese não está ativa.
  const sugestao = ativa ? null : novaChave();

  return (
    <div className="space-y-5 pb-8">
      <Titulo voltar="/ajustes" voltarRotulo="Ajustes">Anamnese</Titulo>
      {ativa ? (
        <Cartao>
          <p className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="size-5 text-emerald-700" aria-hidden />Anamnese ativada</p>
          <p className="mt-1 text-[0.9rem] text-stone-600">As fichas são guardadas criptografadas com a chave desta instalação. Abra a anamnese pela ficha de cada cliente.</p>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[0.85rem] text-amber-950">Nunca troque nem apague a variável <code>PAUSA_ANAMNESE_CHAVE</code> na Vercel: sem a chave, as fichas não abrem mais.</p>
        </Cartao>
      ) : (
        <>
          <Cartao>
            <p className="flex items-center gap-2 text-base font-bold"><ShieldAlert className="size-5 text-amber-700" aria-hidden />Ativar uma vez</p>
            <p className="mt-1 text-[0.9rem] text-stone-600">A chave abaixo protege as fichas de saúde. Ela fica só na Vercel, nunca no banco de dados.</p>
            <p className="mt-3 text-[0.8rem] font-semibold text-stone-500">Sua chave (copie inteira)</p>
            <p className="mt-1 select-all break-all rounded-xl bg-stone-100 p-3 font-mono text-[0.85rem]">{sugestao}</p>
          </Cartao>
          <ol className="list-decimal space-y-2 pl-5 text-[0.95rem] text-stone-700">
            <li><strong>Guarde a chave</strong> num lugar seguro (gerenciador de senhas). Se perder, as fichas não abrem mais.</li>
            <li>Na Vercel, abra o projeto → <strong>Settings → Environment Variables</strong>.</li>
            <li>Crie a variável <code>PAUSA_ANAMNESE_CHAVE</code>, cole a chave, marque <strong>Sensitive</strong> e o ambiente <strong>Production</strong>.</li>
            <li>Em <strong>Deployments</strong>, toque nos três pontinhos do último e em <strong>Redeploy</strong>.</li>
            <li>Volte aqui: deve aparecer "Anamnese ativada".</li>
          </ol>
          <p className="text-[0.8rem] text-stone-500">Recarregar esta página gera outra chave; use a que você copiou e guardou.</p>
        </>
      )}
    </div>
  );
}
