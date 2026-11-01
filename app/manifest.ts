import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pausa',
    short_name: 'Pausa',
    description: 'Agenda, pacotes e pagamentos para quem atende sozinho',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#047857',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
