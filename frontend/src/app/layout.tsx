import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/hooks/useLanguage";
import { PublicEnvScript } from 'next-runtime-env';
import "./globals.css";

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <PublicEnvScript />
      </head>
      <body>
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
