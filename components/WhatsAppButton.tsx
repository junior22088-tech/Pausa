'use client';

import { useTransition } from 'react';

// Registra o envio no histórico e só então abre o WhatsApp com o texto pronto.
// O app nunca sabe se a mensagem foi de fato enviada: por isso "aberto no WhatsApp".
export function WhatsAppButton({
  href, registrar, children, className,
}: { href: string; registrar: () => Promise<void>; children: React.ReactNode; className: string }) {
  const [pendente, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pendente}
      onClick={() =>
        start(async () => {
          try { await registrar(); } catch { /* não bloqueia o envio */ }
          window.location.href = href;
        })
      }
    >
      {pendente ? 'Abrindo…' : children}
    </button>
  );
}
