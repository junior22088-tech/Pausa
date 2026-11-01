'use server';

// Ações da anamnese. Regras: sem consentimento não grava; sem chave não grava; para ler ou gravar,
// a profissional digita a senha de novo (vale 5 minutos). Nada de saúde vai para o histórico (eventos).
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/server';
import { exigirLicenca } from '@/lib/licenca';
import { chaveAnamnese, cifrar, desbloqueioValido, selarDesbloqueio } from '@/lib/cripto';
import { MODELOS, lerRespostas } from '@/lib/anamnese-modelo';

const COOKIE = 'pausa_anamnese';
const MINUTOS = 5;

const texto = (fd: FormData, c: string) => String(fd.get(c) ?? '').trim();
const pagina = (clienteId: string) => `/clientes/${clienteId}/anamnese`;
function falhou(msg: string, voltar: string): never {
  redirect(`${voltar}${voltar.includes('?') ? '&' : '?'}erro=${encodeURIComponent(msg)}`);
}
function feito(url: string, msg: string): never {
  redirect(`${url}${url.includes('?') ? '&' : '?'}feito=${encodeURIComponent(msg)}`);
}

async function escritor() {
  const r = await requireUser();
  await exigirLicenca();
  return r;
}

type Supa = Awaited<ReturnType<typeof requireUser>>['supabase'];
async function anotar(supabase: Supa, cliente_id: string, acao: string) {
  await supabase.from('anamnese_acessos').insert({ cliente_id, acao });
}

/** Está desbloqueada para esta pessoa agora? (usado pela página) */
export async function anamneseDesbloqueada(userId: string) {
  const chave = chaveAnamnese();
  if (!chave) return false;
  return desbloqueioValido(chave, (await cookies()).get(COOKIE)?.value, userId);
}

/** Antes de abrir o WhatsApp com o pedido de autorização: guarda a cópia exata do texto. */
export async function registrarPedidoAnamnese(clienteId: string, textoEnviado: string) {
  const { supabase } = await requireUser();
  await supabase.from('eventos').insert({
    cliente_id: clienteId, entidade: 'anamnese', tipo: 'abriu_whatsapp',
    descricao: 'Pedido de autorização da anamnese aberto no WhatsApp', depois: { texto: textoEnviado },
  });
  await anotar(supabase, clienteId, 'pediu_autorizacao');
  revalidatePath(pagina(clienteId));
}

export async function marcarAutorizacaoAnamnese(fd: FormData) {
  const { supabase } = await escritor();
  const clienteId = texto(fd, 'cliente_id');
  const resposta = texto(fd, 'resposta').slice(0, 200) || null;
  const { data: ultimo } = await supabase.from('eventos').select('depois')
    .eq('cliente_id', clienteId).eq('entidade', 'anamnese').eq('tipo', 'abriu_whatsapp')
    .order('criado_em', { ascending: false }).limit(1).maybeSingle();
  const textoEnviado = (ultimo?.depois as { texto?: string } | null)?.texto;
  if (!textoEnviado) falhou('Envie o pedido de autorização pelo WhatsApp antes de marcar que ela autorizou.', pagina(clienteId));
  const { error } = await supabase.from('anamnese_consentimentos').insert({
    cliente_id: clienteId, texto_enviado: textoEnviado, resposta_literal: resposta,
    hash_sha256: createHash('sha256').update(textoEnviado).digest('hex'),
  });
  if (error) falhou('Não foi possível registrar a autorização.', pagina(clienteId));
  await anotar(supabase, clienteId, 'autorizou');
  await supabase.from('eventos').insert({
    cliente_id: clienteId, entidade: 'anamnese', tipo: 'aceitou',
    descricao: `Cliente autorizou a anamnese${resposta ? ` (resposta: "${resposta}")` : ''}`,
  });
  revalidatePath(`/clientes/${clienteId}`);
  feito(pagina(clienteId), 'Autorização registrada. Agora você pode preencher a anamnese.');
}

/** Digita a senha de novo para abrir a ficha por alguns minutos. */
export async function desbloquearAnamnese(fd: FormData) {
  const { supabase, user } = await requireUser();
  const clienteId = texto(fd, 'cliente_id');
  const chave = chaveAnamnese();
  if (!chave) falhou('A anamnese ainda não foi ativada nesta instalação (Ajustes → Anamnese).', pagina(clienteId));
  const senha = String(fd.get('senha') ?? '');
  if (!senha) falhou('Digite sua senha.', pagina(clienteId));
  const { error } = await supabase.auth.signInWithPassword({ email: user.email!, password: senha });
  if (error) falhou('Senha incorreta. Se você entra só pelo código do e-mail, crie uma senha em Ajustes → Senha.', pagina(clienteId));
  const ate = Date.now() + MINUTOS * 60_000;
  (await cookies()).set(COOKIE, selarDesbloqueio(chave, user.id, ate), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: MINUTOS * 60,
  });
  redirect(pagina(clienteId));
}

export async function bloquearAnamnese(fd: FormData) {
  (await cookies()).delete(COOKIE);
  redirect(`/clientes/${texto(fd, 'cliente_id')}`);
}

export async function salvarAnamnese(fd: FormData) {
  const { supabase, user } = await escritor();
  const clienteId = texto(fd, 'cliente_id');
  const voltar = `${pagina(clienteId)}?editar=1`;
  const chave = chaveAnamnese();
  if (!chave) falhou('A anamnese ainda não foi ativada nesta instalação.', pagina(clienteId));
  if (!(await anamneseDesbloqueada(user.id))) falhou('Por segurança, digite sua senha de novo para salvar.', pagina(clienteId));
  const modelo = MODELOS[texto(fd, 'modelo')] ?? MODELOS.padrao;
  const respostas = lerRespostas(modelo, fd);
  if (!Object.keys(respostas).length) falhou('Preencha pelo menos uma pergunta.', voltar);

  const { data: ultima } = await supabase.from('anamneses').select('versao').eq('cliente_id', clienteId)
    .order('versao', { ascending: false }).limit(1).maybeSingle();
  const versao = (ultima?.versao ?? 0) + 1;
  const { error } = await supabase.from('anamneses').insert({
    cliente_id: clienteId, versao, modelo: modelo.id, modelo_versao: modelo.versao,
    conteudo_cifrado: cifrar(chave, respostas, user.id, clienteId),
  });
  if (error) falhou(error.message.includes('consentimento') ? 'A cliente ainda não autorizou a anamnese.' : 'Não foi possível salvar a anamnese.', voltar);
  await anotar(supabase, clienteId, 'salvou');
  await supabase.from('eventos').insert({ cliente_id: clienteId, entidade: 'anamnese', tipo: 'corrigiu', descricao: `Anamnese ${versao === 1 ? 'preenchida' : `atualizada (versão ${versao})`}` });
  revalidatePath(`/clientes/${clienteId}`);
  feito(pagina(clienteId), versao === 1 ? 'Anamnese salva.' : `Anamnese atualizada (versão ${versao}).`);
}

/** A cliente retirou a autorização: apaga todas as versões e registra a revogação. */
export async function revogarEApagarAnamnese(fd: FormData) {
  const { supabase } = await escritor();
  const clienteId = texto(fd, 'cliente_id');
  await supabase.from('anamneses').delete().eq('cliente_id', clienteId);
  const { count } = await supabase.from('anamneses').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteId);
  if (count) falhou('Não foi possível apagar a anamnese. Tente de novo.', pagina(clienteId));
  await supabase.from('anamnese_consentimentos').update({ revogado_em: new Date().toISOString() }).eq('cliente_id', clienteId).is('revogado_em', null);
  await anotar(supabase, clienteId, 'revogou_e_apagou');
  await supabase.from('eventos').insert({ cliente_id: clienteId, entidade: 'anamnese', tipo: 'anulou', descricao: 'Cliente retirou a autorização: anamnese apagada' });
  (await cookies()).delete(COOKIE);
  revalidatePath(`/clientes/${clienteId}`);
  feito(`/clientes/${clienteId}`, 'Anamnese apagada e autorização retirada.');
}
