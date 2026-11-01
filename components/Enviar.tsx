'use client';

import { useFormStatus } from 'react-dom';

// Botão de envio que trava e mostra "Salvando…" enquanto o servidor responde.
// Evita registro duplicado quando a pessoa toca duas vezes numa rede lenta.
export function Enviar({
  children, className, name, value, formAction, textoEspera = 'Salvando…',
}: {
  children: React.ReactNode;
  className: string;
  name?: string;
  value?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
  textoEspera?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:opacity-60`}
    >
      {pending ? textoEspera : children}
    </button>
  );
}
