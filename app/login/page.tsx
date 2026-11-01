import { criarConta, entrar, entrarComCodigo, entrarComSenha } from '@/lib/actions';
import { Aviso, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';

type Busca = { enviado?: string; erro?: string; email?: string; modo?: string; confirmar?: string };

export default async function Login({ searchParams }: { searchParams: Promise<Busca> }) {
  const { enviado, erro, email, modo, confirmar } = await searchParams;
  const ok = confirmar
    ? 'Conta criada! Confirme pelo link que enviamos ao seu e-mail e depois entre com sua senha.'
    : enviado && !erro
      ? 'Pronto! Abra seu e-mail e toque no link, ou digite abaixo o código que veio junto.'
      : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <h1 className="mb-2 text-3xl font-bold text-emerald-800">Pausa</h1>
      <p className="mb-6 text-lg text-stone-600">Agenda, pacotes e pagamentos no seu celular.</p>
      <Aviso erro={erro} ok={ok} />

      {enviado ? (
        <form action={entrarComCodigo} className="space-y-4">
          <label className="block">
            <span className={rotulo}>Seu e-mail</span>
            <input type="email" name="email" defaultValue={email ?? ''} required className={campo} />
          </label>
          <label className="block">
            <span className={rotulo}>Código do e-mail</span>
            <input name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required className={`${campo} tracking-widest`} placeholder="123456" />
          </label>
          <button className={`${btnPrimario} w-full`}>Entrar com o código</button>
          <a href="/login" className={`${btnSecundario} w-full`}>Voltar</a>
        </form>
      ) : modo === 'link' ? (
        <form action={entrar} className="space-y-4">
          <label className="block">
            <span className={rotulo}>Seu e-mail</span>
            <input type="email" name="email" autoComplete="email" required className={campo} placeholder="voce@email.com" />
          </label>
          <button className={`${btnPrimario} w-full`}>Receber link de acesso</button>
          <a href="/login" className={`${btnSecundario} w-full`}>Entrar com senha</a>
        </form>
      ) : (
        <form action={entrarComSenha} className="space-y-4">
          <label className="block">
            <span className={rotulo}>Seu e-mail</span>
            <input type="email" name="email" autoComplete="email" required className={campo} placeholder="voce@email.com" />
          </label>
          <label className="block">
            <span className={rotulo}>Senha</span>
            <input type="password" name="senha" autoComplete="current-password" required minLength={6} className={campo} />
          </label>
          <button className={`${btnPrimario} w-full`}>Entrar</button>
          <button formAction={criarConta} className={`${btnSecundario} w-full`}>Criar conta (primeira vez)</button>
          <a href="/login?modo=link" className="block py-2 text-center text-base text-stone-600 underline">Esqueci a senha / entrar pelo link do e-mail</a>
        </form>
      )}

      <p className="mt-6 text-base text-stone-500"><a className="underline" href="/wiki/tutoriais/primeiros-passos">Como funciona</a></p>
    </main>
  );
}
