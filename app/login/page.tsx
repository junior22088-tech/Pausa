import { entrar, entrarComCodigo } from '@/lib/actions';
import { Aviso, btnPrimario, btnSecundario, campo, rotulo } from '@/components/ui';

export default async function Login({ searchParams }: { searchParams: Promise<{ enviado?: string; erro?: string; email?: string }> }) {
  const { enviado, erro, email } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <h1 className="mb-2 text-3xl font-bold text-emerald-800">Pausa</h1>
      <p className="mb-6 text-lg text-stone-600">Agenda, pacotes e pagamentos no seu celular.</p>
      <Aviso erro={erro} ok={enviado && !erro ? 'Pronto! Abra seu e-mail e toque no link, ou digite abaixo o código que veio junto.' : undefined} />
      {!enviado ? (
        <form action={entrar} className="space-y-4">
          <label className="block">
            <span className={rotulo}>Seu e-mail</span>
            <input type="email" name="email" autoComplete="email" required className={campo} placeholder="voce@email.com" />
          </label>
          <button className={`${btnPrimario} w-full`}>Receber link de acesso</button>
        </form>
      ) : (
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
          <a href="/login" className={`${btnSecundario} w-full`}>Pedir outro e-mail</a>
        </form>
      )}
      <p className="mt-6 text-base text-stone-500">Sem senha: o acesso chega por e-mail. <a className="underline" href="/wiki/tutoriais/primeiros-passos">Como funciona</a></p>
    </main>
  );
}
