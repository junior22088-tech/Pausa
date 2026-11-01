import { TelaAjustes } from '@/components/telas/Ajustes';
import { carregarProfissional } from '@/lib/dados';
import { linkWhatsApp } from '@/lib/format';
import { definirSenha, salvarAjustes, sair } from '@/lib/actions';
import { Aviso, Cartao, Lista, LinhaLista, Secao, Titulo, btnPerigo, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';
import { CalendarOff, Clock, KeyRound, Sparkles } from 'lucide-react';
import { Enviar } from '@/components/Enviar';

const icone = 'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800';

export default async function Ajustes({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { supabase, user } = await carregarProfissional();
  const { data: p } = await supabase.from('profissionais').select('*').eq('id', user.id).single();
  const suporte = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP;

  return <TelaAjustes p={p} email={user.email ?? ''} suporte={suporte} erro={erro} />;
}
