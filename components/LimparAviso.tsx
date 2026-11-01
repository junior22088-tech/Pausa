'use client';

import { useEffect } from 'react';

// Tira avisos da barra de endereço depois de mostrados, para não reaparecerem ao recarregar.
const AVISOS = ['erro', 'salvo', 'senha', 'ok'];

export function LimparAviso() {
  useEffect(() => {
    const url = new URL(window.location.href);
    let mudou = false;
    for (const k of AVISOS) if (url.searchParams.has(k)) { url.searchParams.delete(k); mudou = true; }
    if (mudou) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);
  return null;
}
