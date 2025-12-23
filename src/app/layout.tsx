import type { Metadata, Viewport } from 'next';
import './globals.css';
import { initializeApp } from '@/lib/init';

export const metadata: Metadata = {
  title: 'Обмен файлами',
  description: 'Простое приложение для обмена файлами',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

initializeApp();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
