'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { exigirLicenca } from '@/lib/licenca';
import { conflito, hhmm, horariosLivres, minutosSP, paraMin, proximosLivres } from '@/lib/agenda-horarios';
import { configAgenda, sessoesDoDia } from '@/lib/agenda-dados';
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

/** Volta para `url` com um aviso de confirmação (o "toast" de components/Toast.tsx). */
function feito(url: string, msg: string) {
  return `${url}${url.includes('?') ? '&' : '?'}feito=${encodeURIComponent(msg)}`;
}
const ddmm = (dia: string) => dia.split('-').reverse().slice(0, 2).join('/');

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
  redirect(feito('/ajustes', 'Senha salva. Da próxima vez, entre com e-mail e senha.'));
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
  redirect(feito('/ajustes', 'Ajustes salvos.'));
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
  redirect(feito(`/clientes/${data.id}?ok=novo`, `${nome} cadastrado.`));
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
  redirect(feito(`/clientes/${id}`, 'Dados corrigidos. A mudança ficou no histórico.'));
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

  const servico_id = texto(fd, 'servico_id') || null;
  const { data: prof } = await supabase.from('profissionais').select('regra_cancelamento').eq('id', user.id).single();
  const { data, error } = await supabase.from('pacotes').insert({
    cliente_id,
    servico_id,
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
  redirect(feito(`/pacotes/${data.id}/resumo`, `Pacote de ${total} sessões criado. Agora envie o resumo.`));
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
  redirect(feito(`/clientes/${p.cliente_id}?ok=aceite`, 'Aceite registrado.'));
}

export async function marcarDesistencia(fd: FormData) {
  const { supabase } = await escritor();
  const pacoteId = texto(fd, 'pacote_id');
  const { data: p } = await supabase.from('pacotes').select('cliente_id').eq('id', pacoteId).single();
  if (!p) falhou('Pacote não encontrado.', '/');
  await supabase.from('pacotes').update({ situacao: 'desistiu' }).eq('id', pacoteId);
  await evento(supabase, { cliente_id: p.cliente_id, entidade: 'pacote', entidade_id: pacoteId, tipo: 'desistiu', descricao: 'Cliente desistiu do pacote' });
  revalidatePath('/', 'layout');
  redirect(feito(`/clientes/${p.cliente_id}`, 'Desistência registrada.'));
}

// ---------------------------------------------------------------- Sessões
async function pacoteAtivo(supabase: Supa, clienteId: string) {
  const { data } = await supabase.from('pacotes_saldo').select('id, saldo, validade_ate, situacao, servico_id')
    .eq('cliente_id', clienteId).in('situacao', ['aguardando_aceite', 'aceito'])
    .gte('validade_ate', diaSP()).gt('saldo', 0).order('criado_em', { ascending: true }).limit(1).maybeSingle();
  return data;
}

/**
 * Confere se `dia hora` está livre para `duracao` (+ intervalo). Se não estiver, volta com o aviso
 * de conflito e os próximos horários livres. `ignorarId` = a própria sessão, ao remarcar.
 */
async function exigirHorarioLivre(
  supabase: Supa, userId: string, dia: string, hora: string, duracao: number, intervalo: number, voltar: string, ignorarId?: string,
) {
  const cfg = await configAgenda(supabase, userId);
  const ocupados = await sessoesDoDia(supabase, dia);
  const t = paraMin(hora);
  const c = conflito(ocupados, t, duracao, intervalo, ignorarId);
  const livres = horariosLivres({ dia, duracao, intervalo, semana: cfg.semana, bloqueios: cfg.bloqueios, ocupados, ignorarId,
    agoraMin: dia === diaSP() ? minutosSP(new Date()) : null });
  const sugestao = proximosLivres(livres, t).map(hhmm).join(', ');
  if (c) {
    falhou(`Conflito: ${hhmm(c.inicio)} às ${hhmm(c.fimAtendimento ?? c.fim)} já está ocupado por ${c.nome}${c.servico ? ` (${c.servico})` : ''}, com intervalo até ${hhmm(c.fim)}.${sugestao ? ` Livres a seguir: ${sugestao}.` : ''}`, voltar);
  }
  if (!livres.normais.includes(t) && !livres.fora.includes(t)) {
    falhou(livres.motivo === 'folga' ? 'Esse dia está marcado como folga.' : `Esse horário não está mais livre.${sugestao ? ` Livres a seguir: ${sugestao}.` : ''}`, voltar);
  }
}

/** Erro de sobreposição vindo da trava do banco (dois aparelhos marcando ao mesmo tempo). */
const ehConflitoNoBanco = (e: { code?: string } | null) => e?.code === '23P01';

export async function marcarSessao(fd: FormData) {
  const { supabase, user } = await escritor();
  const cliente_id = texto(fd, 'cliente_id');
  const servico_id = texto(fd, 'servico_id') || null;
  const dia = texto(fd, 'dia');
  const h = texto(fd, 'hora');
  const voltar = `/agenda/nova?cliente=${cliente_id}${servico_id ? `&servico=${servico_id}` : ''}&dia=${dia}`;
  if (!cliente_id) falhou('Escolha o cliente.', voltar);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(h)) falhou('Escolha o dia e um dos horários livres.', voltar);

  // Toque duplo ou envio repetido: não cria a mesma sessão duas vezes.
  const { data: repetida } = await supabase.from('sessoes').select('id')
    .eq('cliente_id', cliente_id).eq('inicio', instanteSP(dia, h)).eq('situacao', 'marcada').limit(1).maybeSingle();
  if (repetida) redirect(`/agenda?dia=${dia}`);

  const cfg = await configAgenda(supabase, user.id);
  const servico = cfg.servicos.find((x) => x.id === servico_id) ?? null;
  const duracao = servico?.duracao_min ?? 60;
  await exigirHorarioLivre(supabase, user.id, dia, h, duracao, cfg.intervalo, voltar);

  const pacote = await pacoteAtivo(supabase, cliente_id);
  const valorDigitado = texto(fd, 'valor') ? paraCentavos(texto(fd, 'valor')) : null;
  const valorAvulso = pacote ? null : (valorDigitado ?? servico?.preco_centavos ?? null);
  const { data, error } = await supabase.from('sessoes').insert({
    cliente_id, servico_id: servico?.id ?? null, inicio: instanteSP(dia, h), duracao_min: duracao, intervalo_min: cfg.intervalo,
    pacote_id: pacote?.id ?? null, valor_avulso_centavos: valorAvulso,
  }).select('id').single();
  if (ehConflitoNoBanco(error)) falhou('Conflito: esse horário acabou de ser ocupado. Escolha outro.', voltar);
  if (error || !data) falhou('Não foi possível marcar a sessão.', voltar);
  const rotulo = `${servico ? `${servico.nome}, ` : ''}${ddmm(dia)} às ${h}${pacote ? ' (pacote)' : ' (avulsa)'}`;
  await evento(supabase, { cliente_id, entidade: 'sessao', entidade_id: data.id, tipo: 'criou', descricao: `Sessão marcada: ${rotulo}` });
  revalidatePath('/', 'layout');
  redirect(feito(`/agenda?dia=${dia}`, `Sessão marcada: ${rotulo}.`));
}

export async function remarcarSessao(fd: FormData) {
  const { supabase, user } = await escritor();
  const id = texto(fd, 'id');
  const dia = texto(fd, 'dia');
  const h = texto(fd, 'hora');
  const voltar = `/sessoes/${id}/remarcar?dia=${dia}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(h)) falhou('Escolha o dia e um dos horários livres.', voltar);
  const { data: antes } = await supabase.from('sessoes').select('cliente_id, inicio, duracao_min, intervalo_min').eq('id', id).single();
  if (!antes) falhou('Sessão não encontrada.', '/agenda');
  await exigirHorarioLivre(supabase, user.id, dia, h, antes.duracao_min, antes.intervalo_min, voltar, id);
  const inicio = instanteSP(dia, h);
  const { error } = await supabase.from('sessoes').update({ inicio, lembrete_aberto_em: null }).eq('id', id);
  if (ehConflitoNoBanco(error)) falhou('Conflito: esse horário acabou de ser ocupado. Escolha outro.', voltar);
  if (error) falhou('Não foi possível remarcar.', voltar);
  await evento(supabase, { cliente_id: antes.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'corrigiu', descricao: `Sessão remarcada para ${ddmm(dia)} às ${h}`, antes: { inicio: antes.inicio }, depois: { inicio } });
  revalidatePath('/', 'layout');
  redirect(feito(`/sessoes/${id}`, `Sessão remarcada para ${ddmm(dia)} às ${h}.`));
}

export async function cancelarSessao(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const desconta = texto(fd, 'desconta') === 'sim';
  const { data: s } = await supabase.from('sessoes').select('cliente_id, pacote_id, situacao, inicio').eq('id', id).single();
  if (!s) falhou('Sessão não encontrada.', '/agenda');
  if (s.situacao !== 'marcada') redirect(`/clientes/${s.cliente_id}`); // já cancelada (toque duplo)
  // Cancelada com desconto entra no saldo (ver view pacotes_saldo).
  await supabase.from('sessoes').update({ situacao: 'cancelada', desconta: desconta && !!s.pacote_id }).eq('id', id);
  await evento(supabase, { cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'cancelou', descricao: desconta && s.pacote_id ? 'Sessão cancelada e descontada do pacote' : 'Sessão cancelada sem desconto' });
  revalidatePath('/', 'layout');
  redirect(feito(`/agenda?dia=${diaSP(new Date(s.inicio))}`, desconta && s.pacote_id ? 'Sessão cancelada e descontada do pacote.' : 'Sessão cancelada, sem desconto.'));
}

export async function sessaoFeita(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const { data: s } = await supabase.from('sessoes').select('cliente_id, pacote_id, situacao, inicio').eq('id', id).single();
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
  redirect(feito(`/sessoes/${id}/feita`, 'Sessão registrada como feita.'));
}

export async function desfazerFeita(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const { data: s } = await supabase.from('sessoes').select('cliente_id, situacao').eq('id', id).single();
  if (!s || s.situacao !== 'feita') falhou('Essa sessão não está marcada como feita.', `/sessoes/${id}`);
  await supabase.from('sessoes').update({ situacao: 'marcada', desconta: true }).eq('id', id);
  await evento(supabase, { cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: id, tipo: 'corrigiu', descricao: 'Correção: sessão voltou para "marcada" (não foi feita)', antes: { situacao: 'feita' }, depois: { situacao: 'marcada' } });
  revalidatePath('/', 'layout');
  redirect(feito(`/sessoes/${id}`, 'Corrigido: a sessão voltou para marcada e o saldo voltou.'));
}

/** Chamado antes de abrir o WhatsApp com um lembrete ou saldo. */
export async function registrarWhatsApp(sessaoId: string, tipo: 'lembrete' | 'saldo' | 'saldo_corrigido' | 'aviso_folga') {
  const { supabase } = await requireUser();
  const { data: s } = await supabase.from('sessoes').select('cliente_id').eq('id', sessaoId).single();
  if (!s) return;
  if (tipo === 'lembrete') await supabase.from('sessoes').update({ lembrete_aberto_em: new Date().toISOString() }).eq('id', sessaoId);
  await evento(supabase, {
    cliente_id: s.cliente_id, entidade: 'sessao', entidade_id: sessaoId, tipo: 'abriu_whatsapp',
    descricao: tipo === 'lembrete' ? 'Lembrete aberto no WhatsApp' : tipo === 'saldo' ? 'Saldo aberto no WhatsApp' : tipo === 'aviso_folga' ? 'Aviso de folga (pedido para remarcar) aberto no WhatsApp' : 'Saldo corrigido aberto no WhatsApp',
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
  redirect(feito(voltar, `Pagamento de ${reais(valor)} no ${nomeForma} registrado.`));
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
  redirect(feito(`/clientes/${pg.cliente_id}?aba=pagamentos`, 'Pagamento anulado. Ficou riscado no histórico.'));
}

// ---------------------------------------------------------------- Agenda: serviços, horários, folgas
export async function salvarServico(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const nome = texto(fd, 'nome');
  const duracao = Number(texto(fd, 'duracao'));
  const precoTxt = texto(fd, 'preco');
  const preco = precoTxt ? paraCentavos(precoTxt) : null;
  const voltar = id ? `/ajustes/servicos?editar=${id}` : '/ajustes/servicos?novo=1';
  if (!nome) falhou('Dê um nome ao serviço.', voltar);
  if (!Number.isInteger(duracao) || duracao < 10 || duracao > 480) falhou('Escolha a duração.', voltar);
  if (preco !== null && (!Number.isFinite(preco) || preco < 0)) falhou('Confira o preço.', voltar);
  const dados = { nome, duracao_min: duracao, preco_centavos: preco, ativo: true };
  const { error } = id
    ? await supabase.from('servicos').update(dados).eq('id', id)
    : await supabase.from('servicos').insert(dados);
  if (error) falhou('Não foi possível salvar o serviço.', voltar);
  revalidatePath('/', 'layout');
  redirect(feito('/ajustes/servicos', id ? `${nome} atualizado. Sessões já marcadas mantêm a duração antiga.` : `${nome} (${duracao} min) cadastrado.`));
}

export async function desativarServico(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  const { data } = await supabase.from('servicos').update({ ativo: false }).eq('id', id).select('nome').single();
  revalidatePath('/', 'layout');
  redirect(feito('/ajustes/servicos', `${data?.nome ?? 'Serviço'} removido da lista. O histórico continua.`));
}

export async function salvarHorarios(fd: FormData) {
  const { supabase, user } = await escritor();
  const voltar = '/ajustes/horarios';
  const intervalo = Number(texto(fd, 'intervalo'));
  if (!Number.isInteger(intervalo) || intervalo < 0 || intervalo > 120) falhou('Escolha o intervalo entre sessões.', voltar);
  const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const linhas = [];
  for (let d = 0; d < 7; d++) {
    const atende = fd.get(`atende_${d}`) === 'on';
    const ini = paraMin(texto(fd, `inicio_${d}`) || '09:00');
    const fim = paraMin(texto(fd, `fim_${d}`) || '18:00');
    const temAlmoco = fd.get(`almoco_${d}`) === 'on';
    const aIni = temAlmoco ? paraMin(texto(fd, `almoco_inicio_${d}`) || '12:00') : null;
    const aFim = temAlmoco ? paraMin(texto(fd, `almoco_fim_${d}`) || '13:00') : null;
    if (atende && fim <= ini) falhou(`Na ${NOMES[d]}, o fim precisa ser depois do início.`, voltar);
    if (atende && aIni !== null && aFim !== null && (aFim <= aIni || aIni < ini || aFim > fim)) falhou(`Na ${NOMES[d]}, o almoço precisa ficar dentro do horário de atendimento.`, voltar);
    linhas.push({ profissional_id: user.id, dia_semana: d, atende, inicio_min: ini, fim_min: fim, almoco_inicio_min: aIni, almoco_fim_min: aFim });
  }
  const { error } = await supabase.from('horarios_semana').upsert(linhas);
  if (error) falhou('Não foi possível salvar os horários.', voltar);
  await supabase.from('profissionais').update({ intervalo_min: intervalo }).eq('id', user.id);
  revalidatePath('/', 'layout');
  redirect(feito('/ajustes/horarios', `Horários salvos. Intervalo entre sessões: ${intervalo} min.`));
}

export async function criarBloqueio(fd: FormData) {
  const { supabase } = await escritor();
  const voltar = '/ajustes/folgas?nova=1';
  const inicio = texto(fd, 'data_inicio');
  const fim = texto(fd, 'data_fim') || inicio;
  const diaInteiro = texto(fd, 'dia_inteiro') !== 'nao';
  const motivo = texto(fd, 'motivo').slice(0, 120) || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) falhou('Escolha a data.', voltar);
  if (fim < inicio) falhou('A data final precisa ser igual ou depois da inicial.', voltar);
  const hIni = diaInteiro ? null : paraMin(texto(fd, 'inicio') || '00:00');
  const hFim = diaInteiro ? null : paraMin(texto(fd, 'fim') || '00:00');
  if (!diaInteiro && (hFim! <= hIni!)) falhou('O horário final precisa ser depois do inicial.', voltar);
  const { data, error } = await supabase.from('bloqueios').insert({
    data_inicio: inicio, data_fim: fim, dia_inteiro: diaInteiro, inicio_min: hIni, fim_min: hFim, motivo,
  }).select('id').single();
  if (error || !data) falhou('Não foi possível registrar a folga.', voltar);
  revalidatePath('/', 'layout');
  const periodo = inicio === fim ? ddmm(inicio) : `${ddmm(inicio)} a ${ddmm(fim)}`;
  redirect(feito(`/ajustes/folgas?ver=${data.id}`, `Folga registrada: ${periodo}${diaInteiro ? '' : `, ${hhmm(hIni!)} às ${hhmm(hFim!)}`}.`));
}

export async function removerBloqueio(fd: FormData) {
  const { supabase } = await escritor();
  const id = texto(fd, 'id');
  await supabase.from('bloqueios').delete().eq('id', id);
  revalidatePath('/', 'layout');
  redirect(feito('/ajustes/folgas', 'Folga removida. Os horários voltaram a ficar livres.'));
}

// ---------------------------------------------------------------- Licença
export async function verificarLicencaAgora() {
  await requireUser();
  const { estadoLicenca } = await import('@/lib/licenca');
  await estadoLicenca(true);
  revalidatePath('/', 'layout');
  redirect(feito('/instalacao', 'Licença verificada agora.'));
}
