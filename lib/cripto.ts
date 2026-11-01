// Criptografia da anamnese no servidor (AES-256-GCM).
// A chave fica só na variável PAUSA_ANAMNESE_CHAVE (32 bytes em base64), nunca no banco nem no navegador.
// O texto cifrado fica preso à cliente e à profissional (dados adicionais autenticados): copiar
// o conteúdo de uma ficha para outra cliente faz a leitura falhar.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function chaveDe(base64: string | undefined | null): Buffer | null {
  if (!base64) return null;
  try {
    const k = Buffer.from(base64.trim(), 'base64');
    return k.length === 32 ? k : null;
  } catch { return null; }
}

export function chaveAnamnese() {
  return chaveDe(process.env.PAUSA_ANAMNESE_CHAVE);
}

/** Uma chave nova, para a tela de ativação mostrar à profissional (gerada no servidor dela). */
export function novaChave() {
  return randomBytes(32).toString('base64');
}

const contexto = (profissionalId: string, clienteId: string) => Buffer.from(`anamnese:${profissionalId}:${clienteId}`);

export function cifrar(chave: Buffer, dados: unknown, profissionalId: string, clienteId: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave, iv);
  c.setAAD(contexto(profissionalId, clienteId));
  const corpo = Buffer.concat([c.update(JSON.stringify(dados), 'utf8'), c.final()]);
  return `v1:${Buffer.concat([iv, c.getAuthTag(), corpo]).toString('base64')}`;
}

export function decifrar<T = unknown>(chave: Buffer, texto: string, profissionalId: string, clienteId: string): T {
  if (!texto.startsWith('v1:')) throw new Error('formato desconhecido');
  const b = Buffer.from(texto.slice(3), 'base64');
  const d = createDecipheriv('aes-256-gcm', chave, b.subarray(0, 12));
  d.setAAD(contexto(profissionalId, clienteId));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}

// ---- Desbloqueio por alguns minutos (cookie assinado, depois de digitar a senha de novo)
const chaveSelo = (chave: Buffer) => Buffer.from(hkdfSync('sha256', chave, Buffer.alloc(0), 'pausa-desbloqueio-anamnese', 32));

export function selarDesbloqueio(chave: Buffer, userId: string, ateMs: number) {
  const dados = `${userId}.${ateMs}`;
  return `${dados}.${createHmac('sha256', chaveSelo(chave)).update(dados).digest('base64url')}`;
}

export function desbloqueioValido(chave: Buffer, valor: string | undefined, userId: string, agoraMs = Date.now()) {
  if (!valor) return false;
  const [uid, ate, assinatura] = valor.split('.');
  if (uid !== userId || !ate || !assinatura) return false;
  const esperado = createHmac('sha256', chaveSelo(chave)).update(`${uid}.${ate}`).digest();
  const recebido = Buffer.from(assinatura, 'base64url');
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return false;
  return Number(ate) > agoraMs;
}
