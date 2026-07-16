import type React from 'react';
import type { Metadata } from 'next';
import { Archivo, Archivo_Black, JetBrains_Mono } from 'next/font/google';
import { PublicEnvScript } from '@/components/PublicEnvScript';
import { Toaster } from '@/components/ui/sonner';
import { LanguageProvider } from '@/lib/hooks/useLanguage';
import { MotionProvider } from '@/lib/providers/motion-provider';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Minepanel',
  description: 'Minecraft Server Management Panel',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} ${jetbrainsMono.variable}`}>
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
