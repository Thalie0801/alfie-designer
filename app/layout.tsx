import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alfie Designer',
  description: 'Plateforme de création Alfie Designer propulsée par Next.js 14.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
