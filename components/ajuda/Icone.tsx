import { BookOpen, Code2, KeyRound, LifeBuoy, Rocket, Sun } from 'lucide-react';

const ICONES = { rocket: Rocket, sun: Sun, help: LifeBuoy, key: KeyRound, code: Code2 } as const;

export function IconeSecao({ nome, className = 'size-6' }: { nome: string; className?: string }) {
  const C = ICONES[nome as keyof typeof ICONES] ?? BookOpen;
  return <C className={className} aria-hidden />;
}
