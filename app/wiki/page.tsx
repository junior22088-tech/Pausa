import Link from 'next/link';
import { navegacao } from '@/lib/wiki';

export default function WikiInicio() {
  return (
    <>
      <h1>Wiki do Pausa</h1>
      <p>Tutoriais para quem usa o app e a documentação técnica para quem mantém o código.</p>
      {navegacao().map((s) => (
        <section key={s.titulo}>
          <h2>{s.titulo}</h2>
          <ul>{s.itens.map((i) => <li key={i.slug}><Link href={`/wiki/${i.slug}`}>{i.titulo}</Link></li>)}</ul>
        </section>
      ))}
    </>
  );
}
