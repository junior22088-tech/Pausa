// Galeria de telas com dados de exemplo, para revisar o visual sem login.
// Só funciona com PAUSA_GALERIA=1 (desligada no site publicado).
import { notFound } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { Cabecalho } from '@/components/Cabecalho';
import { TelaHoje } from '@/components/telas/Hoje';
import { TelaClientes } from '@/components/telas/Clientes';
import { TelaFichaCliente } from '@/components/telas/FichaCliente';
import { anularPagamento, registrarWhatsApp, sessaoFeita } from '@/lib/actions';

export const dynamic = 'force-dynamic';

const WA = 'https://wa.me/5511987654321?text=Ol%C3%A1';

export default async function Galeria({ searchParams }: { searchParams: Promise<{ tela?: string; aba?: string; vazio?: string }> }) {
  if (process.env.PAUSA_GALERIA !== '1') notFound();
  const { tela = 'hoje', aba = 'sessoes', vazio } = await searchParams;
  const semDados = vazio === '1';

  let conteudo: React.ReactNode = null;
  if (tela === 'hoje') {
    conteudo = (
      <TelaHoje
        dataExtenso="domingo, 1 de novembro" hojeISO="2026-11-01" configurado={!semDados}
        pendencias={semDados ? [] : [
          { id: 'p1', tipo: 'aceite', nome: 'Beatriz Lima', href: '#' },
          { id: 'p2', tipo: 'pacote', nome: 'Carla Souza', valor: 'R$ 900,00', href: '#' },
        ]}
        sessoes={semDados ? [] : [
          { id: 's1', hora: '09:00', nome: 'Ana Paula Ribeiro', situacao: 'feita', tipo: 'pacote', lembreteAberto: true, whatsappHref: WA },
          { id: 's2', hora: '11:30', nome: 'Carla Souza', situacao: 'marcada', tipo: 'pacote', lembreteAberto: true, whatsappHref: WA },
          { id: 's3', hora: '15:00', nome: 'Dona Marlene Alves', situacao: 'marcada', tipo: 'avulsa', lembreteAberto: false, whatsappHref: WA },
        ]}
        sessaoFeita={sessaoFeita}
        registrarLembrete={(id) => registrarWhatsApp.bind(null, id, 'lembrete')}
      />
    );
  } else if (tela === 'clientes') {
    conteudo = (
      <TelaClientes clientes={semDados ? [] : [
        { id: 'c1', nome: 'Ana Paula Ribeiro', telefone: '(11) 98765-4321', pacote: { saldo: 7, total: 10, aguardandoAceite: false, pago: true }, proxima: 'ter 3/11 · 09:00' },
        { id: 'c2', nome: 'Beatriz Lima', telefone: '(11) 91234-5678', pacote: { saldo: 5, total: 5, aguardandoAceite: true, pago: false }, proxima: null },
        { id: 'c3', nome: 'Carla Souza', telefone: '(21) 99876-1234', pacote: { saldo: 1, total: 10, aguardandoAceite: false, pago: false }, proxima: 'hoje · 11:30' },
        { id: 'c4', nome: 'Dona Marlene Alves', telefone: '(11) 3456-7890', pacote: null, proxima: 'hoje · 15:00' },
        { id: 'c5', nome: 'Eduardo Nakamura', telefone: '(11) 97777-1212', pacote: null, proxima: null },
      ]} />
    );
  } else {
    conteudo = (
      <TelaFichaCliente
        aba={aba}
        anularPagamento={anularPagamento}
        dados={{
          cliente: { id: 'c1', nome: 'Ana Paula Ribeiro', telefone: '5511987654321', telefoneBonito: '(11) 98765-4321' },
          whatsappHref: WA,
          pacote: semDados ? null : { id: 'k1', total: 10, usadas: 3, saldo: 7, valor: 'R$ 900,00', validade: '30 de janeiro', situacao: 'aceito', pago: true },
          proximas: semDados ? [] : [
            { id: 'x1', dia: 'ter, 3 de novembro', hora: '09:00' },
            { id: 'x2', dia: 'ter, 10 de novembro', hora: '09:00' },
          ],
          pagamentos: [
            { id: 'g1', data: '20/10', valor: 'R$ 900,00', forma: 'Pix', anulado: false },
            { id: 'g2', data: '20/10', valor: 'R$ 90,00', forma: 'Pix', anulado: true },
          ],
          eventos: [
            { id: 1, data: '01/11', hora: '09:52', descricao: 'Sessão feita (descontada do pacote)' },
            { id: 2, data: '20/10', hora: '18:10', descricao: 'Recebido R$ 900,00 no Pix (pacote)' },
            { id: 3, data: '20/10', hora: '18:02', descricao: 'Aceite marcado pelo profissional (resposta: "Aceito!")' },
            { id: 4, data: '20/10', hora: '17:55', descricao: 'Pacote criado: 10 sessões, R$ 900,00, 90 dias' },
          ],
        }}
      />
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <Cabecalho />
      <main>{conteudo}</main>
      <BottomNav />
    </div>
  );
}
