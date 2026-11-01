import { carregarProfissional } from '@/lib/dados';
import { linkWhatsApp } from '@/lib/format';
import { definirSenha, salvarAjustes, sair } from '@/lib/actions';
import { Aviso, Cartao, Lista, LinhaLista, Secao, Titulo, btnPerigo, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';
import { CalendarOff, Clock, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { Enviar } from '@/components/Enviar';

const icone = 'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800';

export function TelaAjustes({ p, email, suporte, erro }: { p: { nome_mensagem?: string; especialidade?: string | null; endereco?: string | null; regra_cancelamento?: string } | null; email: string; suporte?: string; erro?: string }) {
  return (
    <div className="space-y-5">
      <Titulo>Ajustes</Titulo>
      <Aviso erro={erro} />

      <Secao titulo="Agenda">
        <Lista>
          <LinhaLista href="/ajustes/servicos" inicio={<span className={icone}><Sparkles className="size-5" aria-hidden /></span>} titulo="Serviços" subtitulo="Nome, duração e preço de cada atendimento" />
          <LinhaLista href="/ajustes/horarios" inicio={<span className={icone}><Clock className="size-5" aria-hidden /></span>} titulo="Horários de atendimento" subtitulo="Dias, horários, almoço e intervalo entre sessões" />
          <LinhaLista href="/ajustes/folgas" inicio={<span className={icone}><CalendarOff className="size-5" aria-hidden /></span>} titulo="Folgas e bloqueios" subtitulo="Dias ou horários em que você não atende" />
          <LinhaLista href="/ajustes/anamnese" inicio={<span className={icone}><ShieldCheck className="size-5" aria-hidden /></span>} titulo="Anamnese" subtitulo="Ativar a ficha de saúde protegida" />
        </Lista>
      </Secao>

      <Secao titulo="Suas mensagens">
      <form action={salvarAjustes} className="space-y-4">
        <label className="block"><span className={rotulo}>Seu nome nas mensagens</span><input name="nome_mensagem" defaultValue={p?.nome_mensagem} required placeholder="Ex.: Marta Souza" className={campo} /></label>
        <label className="block"><span className={rotulo}>Especialidade no cabeçalho (opcional)</span><input name="especialidade" defaultValue={p?.especialidade ?? ''} placeholder="Ex.: massoterapia" className={campo} /></label>
        <label className="block"><span className={rotulo}>Endereço no lembrete (opcional)</span><input name="endereco" defaultValue={p?.endereco ?? ''} className={campo} /></label>
        <label className="block"><span className={rotulo}>Regra de cancelamento dos pacotes</span><textarea name="regra_cancelamento" defaultValue={p?.regra_cancelamento} rows={4} required className={`${campo} py-2`} /></label>
        <Enviar className={`${btnPrimario} w-full`}>Salvar</Enviar>
      </form>
      </Secao>

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Seus dados</h2>
        <p className="mb-3 text-base text-stone-600">Para exportar ou apagar os dados de um cliente, ou a sua conta, fale com o suporte. No piloto isso é feito por uma pessoa.</p>
        {suporte
          ? <a href={linkWhatsApp(suporte, 'Olá! Quero pedir exportação ou exclusão de dados no maca & mensagem.')} className={`${btnSecundario} w-full`}>Pedir exportação ou exclusão</a>
          : <p className="text-base text-stone-500">Suporte ainda não configurado.</p>}
      </Cartao>

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Senha</h2>
        <form action={definirSenha} className="space-y-3">
          <label className="block"><span className={rotulo}>Nova senha (mínimo 8 caracteres)</span><input type="password" name="senha" autoComplete="new-password" minLength={8} required className={campo} /></label>
          <Enviar className={`${btnSecundario} w-full`}>Salvar senha</Enviar>
        </form>
      </Cartao>

      <Lista>
        <LinhaLista href="/instalacao" inicio={<span className={icone}><KeyRound className="size-5" aria-hidden /></span>} titulo="Licença desta instalação" subtitulo="Validade e verificação" />
      </Lista>

      <p className="text-base text-stone-500">Conectado como {email}</p>
      <form action={sair}><Enviar className={`${btnPerigo} w-full`}>Sair de todos os aparelhos</Enviar></form>
    </div>
  );
}
