import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'maca & mensagem',
    short_name: 'maca&mensagem',
    description: 'Sua agenda descomplicada: agenda, pacotes, pagamentos e anamnese para massoterapeutas',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#55654F',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512-rounded.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
