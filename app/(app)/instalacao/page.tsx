import { estadoLicenca, MOTIVOS } from '@/lib/licenca';
import { verificarLicencaAgora } from '@/lib/actions';
import { Aviso, Cartao, Titulo, btnSecundario } from '@/components/ui';
import { Enviar } from '@/components/Enviar';

const dataBR = (d: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—';

export default async function Instalacao({ searchParams }: { searchParams: Promise<{ bloqueado?: string; verificado?: string }> }) {
  const { bloqueado, verificado } = await searchParams;
  const l = await estadoLicenca();
  const ok = verificado ? 'Licença verificada agora.' : undefined;
  const erro = bloqueado && !l.podeGravar ? 'Essa ação precisa de licença ativa. Seus dados continuam aqui, só para consulta.' : undefined;

  return (
    <div className="space-y-4">
      <Titulo voltar="/ajustes">Licença</Titulo>
      <Aviso erro={erro} ok={ok} />
      <Cartao>
        <p className={`text-2xl font-bold ${l.podeGravar ? 'text-emerald-800' : 'text-red-800'}`}>
          {l.status === 'dispensada' ? 'Instalação do autor' : l.podeGravar ? 'Ativa' : 'Só leitura'}
        </p>
        <p className="mt-1 text-lg">{MOTIVOS[l.status]}{l.offline && l.podeGravar ? ' (confirmada pela última verificação; o servidor de licenças não respondeu agora).' : ''}</p>
        {l.status !== 'dispensada' && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
            <dt className="text-stone-500">Chave</dt><dd>{l.finalChave ? `…${l.finalChave}` : 'não configurada'}</dd>
            <dt className="text-stone-500">Endereço</dt><dd>{l.dominio || '—'}</dd>
            <dt className="text-stone-500">Vale até</dt><dd>{l.expiraEm ? dataBR(l.expiraEm) : l.status === 'ativa' ? 'conta a partir da ativação' : '—'}</dd>
            <dt className="text-stone-500">Verificada em</dt><dd>{dataBR(l.verificadoEm)}</dd>
          </dl>
        )}
      </Cartao>
      {l.status !== 'dispensada' && (
        <>
          <form action={verificarLicencaAgora}><Enviar className={`${btnSecundario} w-full`} textoEspera="Verificando…">Verificar agora</Enviar></form>
          <Cartao>
            <h2 className="mb-2 text-lg font-bold">Como ativar ou renovar</h2>
            <ol className="list-decimal space-y-1 pl-5 text-base">
              <li>Na hospedagem (Vercel ou Netlify), abra as variáveis de ambiente do projeto.</li>
              <li>Crie ou atualize <code className="font-mono">PAUSA_LICENCA</code> com a chave recebida na compra.</li>
              <li>Publique de novo (Redeploy) e toque em <b>Verificar agora</b>.</li>
            </ol>
            <p className="mt-2 text-base text-stone-600">Sem licença ativa, nada é apagado: agenda, clientes e histórico continuam visíveis.</p>
          </Cartao>
        </>
      )}
    </div>
  );
}
