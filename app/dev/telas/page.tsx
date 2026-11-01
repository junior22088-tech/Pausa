// Galeria de telas com dados de exemplo, para revisar o visual sem login.
// Só funciona com PAUSA_GALERIA=1 (desligada no site publicado).
import { notFound } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { Cabecalho } from '@/components/Cabecalho';
import { TelaHoje } from '@/components/telas/Hoje';
import { TelaClientes } from '@/components/telas/Clientes';
import { TelaFichaCliente } from '@/components/telas/FichaCliente';
import { Suspense } from 'react';
import { anularPagamento, cancelarSessao, desfazerFeita, registrarWhatsApp, sessaoFeita } from '@/lib/actions';
import { TelaAgenda } from '@/components/telas/Agenda';
import { TelaSessao } from '@/components/telas/Sessao';
import { Toast } from '@/components/Toast';
import { ItensPacote } from '@/components/ItensPacote';
import { Titulo, btnPrimario } from '@/components/ui';

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
          { id: 's1', hora: '09:00', nome: 'Ana Paula Ribeiro', situacao: 'feita', tipo: 'pacote', lembreteAberto: true },
          { id: 's2', hora: '11:30', nome: 'Carla Souza', situacao: 'marcada', tipo: 'pacote', lembreteAberto: true },
          { id: 's3', hora: '15:00', nome: 'Dona Marlene Alves', situacao: 'marcada', tipo: 'avulsa', lembreteAberto: false },
        ]}
      />
    );
  } else if (tela === 'agenda') {
    const dias = [['seg','2',2],['ter','3',3],['qua','4',0],['qui','5',1],['sex','6',4],['sáb','7',0],['dom','8',0]] as const;
    conteudo = (
      <TelaAgenda
        mes="novembro de 2026" hojeISO="2026-11-02" selecionado="2026-11-03" tituloDia="terça-feira, 3 de novembro"
        semanaAnterior="2026-10-27" proximaSemana="2026-11-10"
        semana={dias.map(([sigla, numero, qtd], i) => ({ iso: `2026-11-0${i + 2}`, sigla, numero, hoje: numero === '2', qtd }))}
        calendario={semDados ? { expediente: [540, 1080], almoco: [720, 780], folgaDia: null, trechos: [], sessoes: [], livres: [[540, 720], [780, 1080]] } : {
          expediente: [540, 1080], almoco: [720, 780], folgaDia: null,
          trechos: [{ inicio: 960, fim: 1020, motivo: 'Dentista' }],
          sessoes: [
            { id: 'a1', inicio: 540, fimAtendimento: 600, fimOcupado: 615, nome: 'Ana Paula Ribeiro', servico: 'Massagem relaxante', situacao: 'feita', lembreteAberto: true },
            { id: 'a2', inicio: 615, fimAtendimento: 675, fimOcupado: 690, nome: 'Carla Souza', servico: 'Massagem relaxante', situacao: 'marcada', lembreteAberto: true },
            { id: 'a3', inicio: 780, fimAtendimento: 830, fimOcupado: 845, nome: 'Dona Marlene Alves', servico: 'Drenagem linfática', situacao: 'marcada', lembreteAberto: false },
          ],
          livres: [[690, 720], [845, 960], [1020, 1080]],
        }}
      />
    );
  } else if (tela === 'marcar') {
    const { horariosLivres } = await import('@/lib/agenda-horarios');
    const sem = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dia_semana: d, atende: d >= 1 && d <= 5, inicio_min: 540, fim_min: 1080, almoco_inicio_min: d >= 1 && d <= 5 ? 720 : null, almoco_fim_min: d >= 1 && d <= 5 ? 780 : null }));
    const ocup = [{ id: 'x', inicio: 615, fim: 690, nome: 'Carla Souza' }, { id: 'y', inicio: 780, fim: 845, nome: 'Dona Marlene' }];
    const livres = horariosLivres({ dia: '2030-01-08', duracao: 60, intervalo: 15, semana: sem, bloqueios: [{ data_inicio: '2030-01-08', data_fim: '2030-01-08', dia_inteiro: false, inicio_min: 960, fim_min: 1020 }], ocupados: ocup });
    const { EscolhaHorario } = await import('@/components/EscolhaHorario');
    conteudo = (
      <div className="space-y-5">
        <h1 className="text-[1.65rem] font-bold">Marcar sessão</h1>
        <EscolhaHorario semana={[['seg','7',6],['ter','8',9],['qua','9',14],['qui','10',0],['sex','11',3],['sáb','12',0],['dom','13',0]].map(([sigla, numero, l]) => ({ iso: `2030-01-${String(numero).padStart(2, '0')}`, sigla: String(sigla), numero: String(numero), hoje: numero === '7', passado: false, livres: Number(l) }))}
          dia="2030-01-08" livres={livres} horaEscolhida={aba === 'hora' ? '14:15' : null} foraAberto={vazio === 'fora'} duracao={60} intervalo={15} anterior="2030-01-01" proxima="2030-01-15" href={() => '#'} />
      </div>
    );
  } else if (tela === 'sessao' || tela === 'sessao-feita') {
    const feita = tela === 'sessao-feita';
    conteudo = (
      <TelaSessao
        s={{ id: 's2', cliente: { id: 'c3', nome: 'Carla Souza' }, hora: '11:30', diaExtenso: 'terça-feira, 3 de novembro', diaISO: '2026-11-03',
          situacao: feita ? 'feita' : 'marcada', descontada: false, temPacote: !feita, saldoPacote: 1, valorAvulso: feita ? 'R$ 120,00' : null, pago: false,
          lembreteAberto: true, whatsappHref: WA, servico: 'Massagem relaxante', fim: '12:30',
          folga: aba === 'folga' ? { texto: '14:00 às 16:00', avisoHref: WA } : null }}
        sessaoFeita={sessaoFeita} desfazerFeita={desfazerFeita} cancelarSessao={cancelarSessao}
        registrarLembrete={registrarWhatsApp.bind(null, 's2', 'lembrete')} registrarAvisoFolga={registrarWhatsApp.bind(null, 's2', 'aviso_folga')}
      />
    );
  } else if (tela === 'pacote' || tela === 'pacote-editar') {
    const editar = tela === 'pacote-editar';
    const servicos = [
      { id: 's1', nome: 'Drenagem linfática', duracao_min: 50, preco_centavos: 11000 },
      { id: 's2', nome: 'Massagem relaxante', duracao_min: 60, preco_centavos: 12000 },
      { id: 's3', nome: 'Pedras quentes', duracao_min: 90, preco_centavos: 18000 },
    ];
    conteudo = (
      <form className="space-y-6 pb-8">
        <Titulo voltar="#" voltarRotulo={editar ? 'Resumo' : 'Ana Paula Ribeiro'}>{editar ? 'Editar pacote' : 'Novo pacote'}</Titulo>
        <ItensPacote servicos={servicos} valorInicial={editar ? 100000 : null} iniciais={editar ? [
          { id: 'i1', servico_id: 's2', nome: 'Massagem relaxante', duracao_min: 60, quantidade: 6, preco_unit_centavos: 12000, usadas: 2 },
          { id: 'i2', servico_id: 's1', nome: 'Drenagem linfática', duracao_min: 50, quantidade: 4, preco_unit_centavos: 11000, usadas: 1 },
          { id: 'i3', servico_id: null, nome: 'Avaliação postural', duracao_min: 30, quantidade: 1, preco_unit_centavos: null, usadas: 0 },
        ] : []} />
        <button type="button" className={`${btnPrimario} w-full`}>{editar ? 'Salvar e reenviar resumo' : 'Salvar e preparar resumo'}</button>
      </form>
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
          pacote: semDados ? null : { id: 'k1', total: 10, usadas: 3, saldo: 7, valor: 'R$ 1.000,00', validade: '30 de janeiro', situacao: 'aceito', pago: true, versao: 2, itens: [{ nome: 'Massagem relaxante', saldo: 4, quantidade: 6 }, { nome: 'Drenagem linfática', saldo: 3, quantidade: 4 }] },
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
      <Suspense><Toast /></Suspense>
    </div>
  );
}
