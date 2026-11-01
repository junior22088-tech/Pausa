'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { exigirLicenca } from '@/lib/licenca';
import { instanteSP, normalizarTelefone, paraCentavos, reais, somarDias, diaSP } from '@/lib/format';

type Supa = Awaited<ReturnType<typeof createClient>>;

// Linha do tempo: todo fato relevante vira um evento que nunca é apagado.
async function evento(
  supabase: Supa,
  e: { cliente_id?: string | null; entidade: string; entidade_id?: string | null; tipo: string; descricao: string; antes?: unknown; depois?: unknown },
) {
  const { error } = await supabase.from('eventos').insert({
    cliente_id: e.cliente_id ?? null,
    entidade: e.entidade,
    entidade_id: e.entidade_id ?? null,
    tipo: e.tipo,
    descricao: e.descricao,
    antes: e.antes ?? null,
    depois: e.depois ?? null,
  });
  if (error) throw new Error('Não foi possível registrar o histórico. Tente de novo.');
}

/** Usuário logado + licença ativa. Toda ação que grava dados começa por aqui. */
async function escritor() {
  const r = await requireUser();
  await exigirLicenca();
  return r;
}

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? '').trim();
}

function falhou(msg: string, voltar: string): never {
  redirect(`${voltar}${voltar.includes('?') ? '&' : '?'}erro=${encodeURIComponent(msg)}`);
}

// ---------------------------------------------------------------- Acesso
export async function entrar(fd: FormData) {
  const email = texto(fd, 'email').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) falhou('Confira o e-mail digitado.', '/login');
  const h = await headers();
  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origem}/auth/callback` },
  });
  if (error) {
    if (error.status === 429 || /rate limit/i.test(error.message))
      falhou('Limite de e-mails por hora atingido. Tente de novo em cerca de 1 hora, ou entre com sua senha.', '/login?modo=link');
    falhou('Não conseguimos enviar o link agora. Tente em instantes.', '/login?modo=link');
  }
  redirect(`/login?enviado=1&email=${encodeURIComponent(email)}`);
}

/** Alternativa ao link: código de 6 dígitos do mesmo e-mail (útil no app instalado no iPhone). */
export async function entrarComCodigo(fd: FormData) {
  const email = texto(fd, 'email').toLowerCase();
  const token = texto(fd, 'codigo').replace(/\D/g, '');
  if (!email || token.length < 6) falhou('Digite o e-mail e o código de 6 dígitos.', '/login?enviado=1');
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) falhou('Código vencido ou incorreto. Peça um novo.', '/login?enviado=1');
  redirect('/');
}

// ---------------------------------------------------------------- Senha
function emailValido(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function entrarComSenha(fd: FormData) {
  const email = texto(fd, 'email').toLowerCase();
  const senha = String(fd.get('senha') ?? '');
  if (!emailValido(email) || !senha) falhou('Digite e-mail e senha.', '/login');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (/confirm/i.test(error.message)) falhou('Confirme seu e-mail pelo link que enviamos e tente de novo.', '/login');
    falhou('E-mail ou senha incorretos. Se ainda não tem conta, toque em Criar conta.', '/login');
  }
  redirect('/');
}

export async function criarConta(fd: FormData) {
  const email = texto(fd, 'email').toLowerCase();
  const senha = String(fd.get('senha') ?? '');
  if (!emailValido(email)) falhou('Confira o e-mail digitado.', '/login');
  if (senha.length < 8) falhou('A senha precisa ter pelo menos 8 caracteres.', '/login');
  const h = await headers();
  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: `${origem}/auth/callback` },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message))
      falhou('Esse e-mail já tem conta. Toque em Entrar, ou entre pelo link por e-mail e defina a senha em Ajustes.', '/login');
    if (error.status === 429 || /rate limit/i.test(error.message))
      falhou('Limite de e-mails por hora atingido. Tente de novo em cerca de 1 hora.', '/login');
    falhou('Não foi possível criar a conta agora. Tente em instantes.', '/login');
  }
  if (data.session) redirect('/');
  redirect('/login?confirmar=1');
}

/** Para quem entrou pelo link do e-mail e quer passar a usar senha. */
export async function definirSenha(fd: FormData) {
  const senha = String(fd.get('senha') ?? '');
  if (senha.length < 8) falhou('A senha precisa ter pelo menos 8 caracteres.', '/ajustes');
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) falhou('Não foi possível salvar a senha. Tente outra.', '/ajustes');
  redirect('/ajustes?senha=1');
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'global' }); // sai de todos os aparelhos
  redirect('/login');
}

// ---------------------------------------------------------------- Ajustes
export async function salvarAjustes(fd: FormData) {
  const { supabase, user } = await escritor();
  const dados = {
    nome_mensagem: texto(fd, 'nome_mensagem'),
    especialidade: texto(fd, 'especialidade') || null,
    endereco: texto(fd, 'endereco') || null,
    regra_cancelamento: texto(fd, 'regra_cancelamento'),
  };
  if (!dados.nome_mensagem) falhou('Diga como seu nome aparece nas mensagens.', '/ajustes');
  if (!dados.regra_cancelamento) falhou('Escreva sua regra de cancelamento.', '/ajustes');
  const { error } = await supabase.from('profissionais').update(dados).eq('id', user.id);
  if (error) falhou('Não foi possível salvar. Tente de novo.', '/ajustes');
  revalidatePath('/', 'layout');
  redirect('/ajustes?salvo=1');
}

// ---------------------------------------------------------------- Clientes
export async function criarCliente(fd: FormData) {
  const { supabase } = await escritor();
  const nome = texto(fd, 'nome');
  const telefone = normalizarTelefone(texto(fd, 'telefone'));
  if (!nome) falhou('Escreva o nome do cliente.', '/clientes/novo');
  if (!telefone) falhou('Telefone com DDD, por exemplo (11) 99999-0000.', '/clientes/novo');
  const { data, error } = await supabase.from('clientes').insert({ nome, telefone }).select('id').single();
  if (error || !data) falhou('Não foi possível cadastrar. Tente de novo.', '/clientes/novo');
  await evento(supabase, { cliente_id: data.id, entidade: 'cliente', entidade_id: data.id, tipo: 'criou', descricao: `Cliente cadastrado: ${nome}` });
  revalidatePath('/clientes');
  redirect(`/clientes/${data.id}?ok=novo`);
}

export async function corrigirCliente(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const nome = texto(fd, 'nome');
  const telefone = normalizarTelefone(texto(fd, 'telefone'));
  if (!nome || !telefone) falhou('Confira nome e telefone com DDD.', `/clientes/${id}/editar`);
  const { data: antes } = await supabase.from('clientes').select('nome, telefone').eq('id', id).single();
  const { error } = await supabase.from('clientes').update({ nome, telefone }).eq('id', id);
  if (error) falhou('Não foi possível salvar.', `/clientes/${id}/editar`);
  await evento(supabase, { cliente_id: id, entidade: 'cliente', entidade_id: id, tipo: 'corrigiu', descricao: 'Dados do cliente corrigidos', antes, depois: { nome, telefone } });
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

// ---------------------------------------------------------------- Pacotes
export async function criarPacote(fd: FormData) {
  const { supabase, user } = await escritor();
  const cliente_id = texto(fd, 'cliente_id');
  const voltar = `/clientes/${cliente_id}/pacote`;
  // Número digitado vale mais que o botão: quem digitou 29 quer 29, mesmo sem tocar em "Outro".
  const totalDigitado = texto(fd, 'total_outro').replace(/\D/g, '');
  if (texto(fd, 'total_sessoes') === 'outro' && !totalDigitado) falhou('Digite quantas sessões tem o pacote.', voltar);
  const total = Number(totalDigitado || texto(fd, 'total_sessoes'));
  const valor = paraCentavos(texto(fd, 'valor'));
  const diasDigitados = texto(fd, 'validade_outro').replace(/\D/g, '');
  if (texto(fd, 'validade_dias') === 'outro' && !diasDigitados) falhou('Digite quantos dias vale o pacote.', voltar);
  const diasValidade = Number(diasDigitados || texto(fd, 'validade_dias'));
  if (!Number.isInteger(total) || total < 1 || total > 100) falhou('Número de sessões entre 1 e 100.', voltar);
  if (!Number.isFinite(valor) || valor < 0) falhou('Confira o valor do pacote.', voltar);
  if (!Number.isInteger(diasValidade) || diasValidade < 1 || diasValidade > 730) falhou('Validade entre 1 e 730 dias.', voltar);

  const { data: prof } = await supabase.from('profissionais').select('regra_cancelamento').eq('id', user.id).single();
  const { data, error } = await supabase.from('pacotes').insert({
    cliente_id,
    total_sessoes: total,
    valor_centavos: valor,
    validade_ate: somarDias(diaSP(), diasValidade),
    regra_cancelamento: prof?.regra_cancelamento ?? '',
  }).select('id').single();
  if (error || !data) falhou('Não foi possível criar o pacote.', voltar);
  await evento(supabase, {
    cliente_id, entidade: 'pacote', entidade_id: data.id, tipo: 'criou',
    descricao: `Pacote criado: ${total} sessões, ${reais(valor)}, ${diasValidade} dias`,
  });
  revalidatePath(`/clientes/${cliente_id}`);
  redirect(`/pacotes/${data.id}/resumo`);
}

/** Chamado antes de abrir o WhatsApp com o resumo: guarda a cópia exata do texto. */
export async function registrarEnvioResumo(pacoteId: string, textoEnviado: string) {
  const { supabase } = await requireUser();
  const { data: p } = await supabase.from('pacotes').select('cliente_id').eq('id', pacoteId).single();
  if (!p) return;
  await evento(supabase, {
    cliente_id: p.cliente_id, entidade: 'pacote', entidade_id: pacoteId, tipo: 'abriu_whatsapp',
    descricao: 'Resumo do pacote aberto no WhatsApp', depois: { texto: textoEnviado },
  });
  revalidatePath('/');
}

export async function marcarAceite(fd: FormData) {
  const { supabase } = await escritor();
  const pacoteId = texto(fd, 'pacote_id');
  const resposta = texto(fd, 'resposta') || null;
  const { data: p } = await supabase.from('pacotes').select('cliente_id, situacao').eq('id', pacoteId).single();
  if (!p) falhou('Pacote não encontrado.', '/');

  const { data: ultimo } = await supabase.from('eventos').select('depois')
    .eq('entidade_id', pacoteId).eq('tipo', 'abriu_whatsapp').order('criado_em', { ascending: false }).limit(1).maybeSingle();
  const textoEnviado = (ultimo?.depois as { texto?: string } | null)?.texto;
  if (!textoEnviado) falhou('Envie o resumo pelo WhatsApp antes de marcar o aceite.', `/pacotes/${pacoteId}/resumo`);

  const { count } = await supabase.from('aceites').select('id', { count: 'exact', head: true }).eq('pacote_id', pacoteId);
  const hash = createHash('sha256').update(textoEnviado).digest('hex');
  const { error } = await supabase.from('aceites').insert({
    pacote_id: pacoteId, texto_enviado: textoEnviado, hash_sha256: hash, versao: (count ?? 0) + 1, resposta_literal: resposta,
  });
  if (error) falhou('Não foi possível registrar o aceite.', `/pacotes/${pacoteId}/resumo`);
  await supabase.from('pacotes').update({ situacao: 'aceito' }).eq('id', pacoteId);
  await evento(supabase, {
    cliente_id: p.cliente_id, entidade: 'pacote', entidade_id: pacoteId, tipo: 'aceitou',
    descricao: `Aceite marcado pelo profissional${resposta ? ` (resposta: "${resposta}")` : ''}`,
    depois: { hash },
  });
  revalidatePath('/', 'layout');
  redirect(`/clientes/${p.cliente_id}?ok=aceite`);
}

export async function marcarDesistencia(fd: FormData) {
  const { supabase } = await escritor();
  const pacoteId = texto(fd, 'pacote_id');
  const { data: p } = await supabase.from('pacotes').select('cliente_id').eq('id', pacoteId).single();
  if (!p) falhou('Pacote não encontrado.', '/');
  await supabase.from('pacotes').update({ situacao: 'desistiu' }).eq('id', pacoteId);
  await evento(supabase, { cliente_id: p.cliente_id, entidade: 'pacote', entidade_id: pacoteId, tipo: 'desistiu', descricao: 'Cliente desistiu do pacote' });
  revalidatePath('/', 'layout');
  redirect(`/clientes/${p.cliente_id}`);
}

// ---------------------------------------------------------------- Sessões
async function pacoteAtivo(supabase: Supa, clienteId: string) {
  const { data } = await supabase.from('pacotes_saldo').select('id, saldo, validade_ate, situacao')
    .eq('cliente_id', clienteId).in('situacao', ['aguardando_aceite', 'aceito'])
    .gte('validade_ate', diaSP()).gt('saldo', 0).order('criado_em', { ascending: true }).limit(1).maybeSingle();
  return data;
}

export async function marcarSessao(fd: FormData) {
  const { supabase } = await escritor();
  const cliente_id = texto(fd, 'cliente_id');
  const dia = texto(fd, 'dia');
  const h = texto(fd, 'hora');
  const voltar = `/agenda/nova?dia=${dia}`;
  if (!cliente_id) falhou('Escolha o cliente.', voltar);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(h)) falhou('Escolha dia e horário.', voltar);
  // Toque duplo ou envio repetido: não cria a mesma sessão duas vezes.
  const { data: repetida } = await supabase.from('sessoes').select('id')
    .eq('cliente_id', cliente_id).eq('inicio', instanteSP(dia, h)).eq('situacao', 'marcada').limit(1).maybeSingle();
  if (repetida) redirect(`/agenda?dia=${dia}`);
  const pacote = await pacoteAtivo(supabase, cliente_id);
  const valorAvulso = texto(fd, 'valor') ? paraCentavos(texto(fd, 'valor')) : null;
  const { data, error } = await supabase.from('sessoes').insert({
    cliente_id, inicio: instanteSP(dia, h), pacote_id: pacote?.id ?? null,
    valor_avulso_centavos: pacote ? null : valorAvulso,
  }).select('id').single();
  if (error || !data) falhou('Não foi possível marcar a sessão.', voltar);
  await evento(supabase, { cliente_id, entidade: 'sessao', entidade_id: data.id, tipo: 'criou', descricao: `Sessão marcada para ${dia.split('-').reverse().join('/')} às ${h}${pacote ? ' (pacote)' : ' (avulsa)'}` });
  revalidatePath('/', 'layout');
  redirect(`/agenda?dia=${dia}`);
}

export async function remarcarSessao(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const dia = texto(fd, 'dia');
  const h = texto(fd, 'hora');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(h)) falhou('Escolha dia e horário.', `/sessoes/${id}`);
  const { data: antes } = await supabase.from('sessoes').select('cliente_id, inicio').eq('id', id).single();
  if (!antes) falhou('Sessão não encontrada.', '/agenda');
  const inicio = instanteSP(dia, h);
  await supabase.from('sessoes').update({ inicio, lembrete_aberto_em: null }).eq('id', id);
  await evento(supabase, { cliente_id: antes.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'corrigiu', descricao: `Sessão remarcada para ${dia.split('-').reverse().join('/')} às ${h}`, antes: { inicio: antes.inicio }, depois: { inicio } });
  revalidatePath('/', 'layout');
  redirect(`/sessoes/${id}`);
}

export async function cancelarSessao(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const desconta = texto(fd, 'desconta') === 'sim';
  const { data: s } = await supabase.from('sessoes').select('cliente_id, pacote_id, situacao').eq('id', id).single();
  if (!s) falhou('Sessão não encontrada.', '/agenda');
  if (s.situacao !== 'marcada') redirect(`/clientes/${s.cliente_id}`); // já cancelada (toque duplo)
  // Cancelada com desconto entra no saldo (ver view pacotes_saldo).
  await supabase.from('sessoes').update({ situacao: 'cancelada', desconta: desconta && !!s.pacote_id }).eq('id', id);
  await evento(supabase, { cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'cancelou', descricao: desconta && s.pacote_id ? 'Sessão cancelada e descontada do pacote' : 'Sessão cancelada sem desconto' });
  revalidatePath('/', 'layout');
  redirect(`/clientes/${s.cliente_id}`);
}

export async function sessaoFeita(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const { data: s } = await supabase.from('sessoes').select('cliente_id, pacote_id, situacao').eq('id', id).single();
  if (!s) falhou('Sessão não encontrada.', '/');
  // Segundo toque: a sessão já está feita; não recalcula (evitaria virar avulsa na última do pacote).
  if (s.situacao !== 'marcada') redirect(`/sessoes/${id}/feita`);
  let pacoteId = s.pacote_id;
  if (pacoteId) {
    const { data: p } = await supabase.from('pacotes_saldo').select('saldo').eq('id', pacoteId).single();
    if (!p || p.saldo <= 0) {
      // Pacote esgotado: o saldo nunca fica negativo; vira avulsa.
      pacoteId = null;
    }
  }
  await supabase.from('sessoes').update({ situacao: 'feita', pacote_id: pacoteId, desconta: !!pacoteId }).eq('id', id);
  await evento(supabase, { cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'feita', descricao: pacoteId ? 'Sessão feita (descontada do pacote)' : 'Sessão avulsa feita' });
  revalidatePath('/', 'layout');
  redirect(`/sessoes/${id}/feita`);
}

export async function desfazerFeita(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const { data: s } = await supabase.from('sessoes').select('cliente_id, situacao').eq('id', id).single();
  if (!s || s.situacao !== 'feita') falhou('Essa sessão não está marcada como feita.', `/sessoes/${id}`);
  await supabase.from('sessoes').update({ situacao: 'marcada', desconta: true }).eq('id', id);
  await evento(supabase, { cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'corrigiu', descricao: 'Correção: sessão voltou para "marcada" (não foi feita)', antes: { situacao: 'feita' }, depois: { situacao: 'marcada' } });
  revalidatePath('/', 'layout');
  redirect(`/sessoes/${id}`);
}

/** Chamado antes de abrir o WhatsApp com um lembrete ou saldo. */
export async function registrarWhatsApp(sessaoId: string, tipo: 'lembrete' | 'saldo' | 'saldo_corrigido') {
  const { supabase } = await requireUser();
  const { data: s } = await supabase.from('sessoes').select('cliente_id').eq('id', sessaoId).single();
  if (!s) return;
  if (tipo === 'lembrete') await supabase.from('sessoes').update({ lembrete_aberto_em: new Date().toISOString() }).eq('id', sessaoId);
  await evento(supabase, {
    cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: sessaoId, tipo: 'abriu_whatsapp',
    descricao: tipo === 'lembrete' ? 'Lembrete aberto no WhatsApp' : tipo === 'saldo' ? 'Saldo aberto no WhatsApp' : 'Saldo corrigido aberto no WhatsApp',
  });
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------- Pagamentos
export async function registrarPagamento(fd: FormData) {
  const { supabase } = await escritor();
  const pacote_id = texto(fd, 'pacote_id') || null;
  const sessao_id = texto(fd, 'sessao_id') || null;
  const forma = texto(fd, 'forma');
  const valor = paraCentavos(texto(fd, 'valor'));
  const voltar = texto(fd, 'voltar') || '/';
  if (!['pix', 'cartao', 'dinheiro'].includes(forma)) falhou('Escolha Pix, Cartão ou Dinheiro.', voltar);
  if (!Number.isFinite(valor) || valor <= 0) falhou('Confira o valor recebido.', voltar);

  let cliente_id: string | null = null;
  if (pacote_id) {
    const { data } = await supabase.from('pacotes').select('cliente_id').eq('id', pacote_id).single();
    cliente_id = data?.cliente_id ?? null;
  } else if (sessao_id) {
    const { data } = await supabase.from('sessoes').select('cliente_id').eq('id', sessao_id).single();
    cliente_id = data?.cliente_id ?? null;
  }
  if (!cliente_id) falhou('Pagamento sem pacote ou sessão.', voltar);

  // Toque duplo: se o mesmo pagamento acabou de ser registrado, não registra de novo.
  const doisMinutos = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  let repetido = supabase.from('pagamentos').select('id').is('anulado_em', null)
    .eq('valor_centavos', valor).eq('forma', forma).gte('recebido_em', doisMinutos);
  repetido = pacote_id ? repetido.eq('pacote_id', pacote_id) : repetido.eq('sessao_id', sessao_id!);
  const { data: jaTem } = await repetido.limit(1).maybeSingle();
  if (jaTem) redirect(voltar);

  const { data: pg, error } = await supabase.from('pagamentos').insert({ cliente_id, pacote_id, sessao_id, valor_centavos: valor, forma }).select('id').single();
  if (error || !pg) falhou('Não foi possível registrar o pagamento.', voltar);
  if (pacote_id) await supabase.from('pacotes').update({ pago: true }).eq('id', pacote_id);
  if (sessao_id) await supabase.from('sessoes').update({ pago: true }).eq('id', sessao_id);
  const nomeForma = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' }[forma];
  await evento(supabase, { cliente_id, entidade: 'pagamento', entidade_id: pg.id, tipo: 'recebeu', descricao: `Recebido ${reais(valor)} no ${nomeForma}${pacote_id ? ' (pacote)' : ' (sessão avulsa)'}` });
  revalidatePath('/', 'layout');
  redirect(voltar);
}

export async function anularPagamento(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const { data: pg } = await supabase.from('pagamentos').select('cliente_id, pacote_id, sessao_id, valor_centavos, anulado_em').eq('id', id).single();
  if (!pg || pg.anulado_em) falhou('Pagamento não encontrado ou já anulado.', '/');
  await supabase.from('pagamentos').update({ anulado_em: new Date().toISOString() }).eq('id', id);
  if (pg.pacote_id) await supabase.from('pacotes').update({ pago: false }).eq('id', pg.pacote_id);
  if (pg.sessao_id) await supabase.from('sessoes').update({ pago: false }).eq('id', pg.sessao_id);
  await evento(supabase, { cliente_id: pg.cliente_id, entidade: 'pagamento', entidade_id: id, tipo: 'anulou', descricao: `Correção: pagamento de ${reais(pg.valor_centavos)} anulado` });
  revalidatePath('/', 'layout');
  redirect(`/clientes/${pg.cliente_id}`);
}

// ---------------------------------------------------------------- Licença
export async function verificarLicencaAgora() {
  await requireUser();
  const { estadoLicenca } = await import('@/lib/licenca');
  await estadoLicenca(true);
  revalidatePath('/', 'layout');
  redirect('/instalacao?verificado=1');
}
