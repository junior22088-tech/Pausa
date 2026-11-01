import { notFound } from 'next/navigation';
import { pagina, todasAsPaginas } from '@/lib/wiki';

// Páginas geradas no build a partir de content/wiki/*.md
export const dynamicParams = false;
export function generateStaticParams() {
  return todasAsPaginas().map((p) => ({ slug: p.slug.split('/') }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return { title: `${pagina(slug.join('/'))?.titulo ?? 'Wiki'} · Pausa` };
}

export default async function PaginaWiki({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const p = pagina(slug.join('/'));
  if (!p) notFound();
  return <div dangerouslySetInnerHTML={{ __html: p.html }} />;
}
