import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'maca & mensagem',
  description: 'Agenda, pacotes e pagamentos para quem atende sozinho',
  appleWebApp: { capable: true, title: 'maca & mensagem', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#55654F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
