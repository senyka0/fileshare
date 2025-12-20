import type { Metadata } from 'next';
import './globals.css';
import { initializeApp } from '@/lib/init';

export const metadata: Metadata = {
  title: 'File Sharing',
  description: 'Simple file sharing application',
};

initializeApp();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
