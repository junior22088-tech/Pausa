import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarProfissional } from '@/lib/dados';
import { linkWhatsApp, msgSaldo } from '@/lib/format';
import { registrarWhatsApp } from '@/lib/actions';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Cartao, btnPrimario, btnSecundario } from '@/components/ui';

export default async function SessaoFeita({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, prof } = await carregarProfissional();
  const { data: s } = await supabase.from('sessoes').select('id, cliente_id, pacote_id, pago, clientes(nome, telefone)').eq('id', id).maybeSingle();
  if (!s) notFound();
  const cliente = s.clientes as any;

  if (!s.pacote_id) {
    return (
      <div className="space-y-4">
        <Cartao><p className="text-2xl font-bold">Sessão avulsa feita ✓</p><p className="text-lg">{cliente.nome}</p></Cartao>
        {!s.pago && <Link href={`/pagamento?sessao=${id}`} className={`${btnPrimario} w-full`}>Recebi o pagamento</Link>}
        <Link href="/" className={`${btnSecundario} w-full`}>Depois</Link>
        <p className="text-base text-stone-500">Se o cliente tinha pacote esgotado, crie um novo pacote na ficha dele.</p>
      </div>
    );
  }

  const { data: p } = await supabase.from('pacotes_saldo').select('saldo, total_sessoes, validade_ate').eq('id', s.pacote_id).single();
  const texto = msgSaldo(prof, cliente.nome, p!.saldo, p!.total_sessoes, p!.validade_ate);
  return (
    <div className="space-y-4">
      <Cartao>
        <p className="text-lg">{cliente.nome}</p>
        <p className="text-4xl font-bold">Restam {p!.saldo} de {p!.total_sessoes}</p>
      </Cartao>
      <WhatsAppButton className={`${btnPrimario} w-full`} href={linkWhatsApp(cliente.telefone, texto)} registrar={registrarWhatsApp.bind(null, id, 'saldo')}>
        Enviar saldo
      </WhatsAppButton>
      <Link href="/" className={`${btnSecundario} w-full`}>Agora não</Link>
      {p!.saldo === 0 && <Link href={`/clientes/${s.cliente_id}/pacote`} className={`${btnSecundario} w-full`}>Pacote acabou: criar novo</Link>}
    </div>
  );
}
