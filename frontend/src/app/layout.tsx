import type React from 'react';
import type { Metadata } from 'next';
import { PublicEnvScript } from '@/components/PublicEnvScript';
import { Toaster } from '@/components/ui/sonner';
import { LanguageProvider } from '@/lib/hooks/useLanguage';
import { MotionProvider } from '@/lib/providers/motion-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minepanel',
  description: 'Minecraft Server Management Panel',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <PublicEnvScript />
      </head>
      <body>
        <MotionProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
