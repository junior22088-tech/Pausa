import { requireUser } from '@/lib/supabase/server';

export async function carregarProfissional() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('profissionais').select('*').eq('id', user.id).single();
  const prof = {
    nome_mensagem: data?.nome_mensagem || 'Seu profissional',
    especialidade: data?.especialidade ?? null,
    endereco: data?.endereco ?? null,
    regra_cancelamento: data?.regra_cancelamento ?? '',
    configurado: !!data?.nome_mensagem,
  };
  return { supabase, user, prof };
}

export type Cliente = { id: string; nome: string; telefone: string };
