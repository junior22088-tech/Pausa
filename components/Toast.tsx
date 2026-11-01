'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CircleCheck, X } from 'lucide-react';

// Aviso de confirmação depois de toda ação que muda algo ("Sessão remarcada para 03/11 às 15:00.").
// As ações do servidor voltam com ?feito=<mensagem>; aqui mostramos e limpamos a URL.
export function Toast() {
  const params = useSearchParams();
  const caminho = usePathname();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const feito = params.get('feito');
    if (!feito) return;
    setMsg(feito);
    const url = new URL(window.location.href);
    url.searchParams.delete('feito');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [params, caminho]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
      {msg && (
        <div role="status" className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-[0.95rem] text-white shadow-xl animate-[toast_.2s_ease-out]">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
          <span className="flex-1">{msg}</span>
          <button type="button" onClick={() => setMsg(null)} className="-mr-1 -mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-white/10" aria-label="Fechar aviso">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
