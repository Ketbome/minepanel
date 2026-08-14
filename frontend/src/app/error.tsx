'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/hooks/useLanguage';

export default function Error({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen mp-blueprint items-center justify-center p-6">
      <div className="max-w-lg w-full bg-gray-900/95 border-2 border-red-600/40 rounded-lg p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-minecraft text-red-400 mb-2">{t('unexpectedError')}</h1>
        <p className="text-sm text-gray-300 mb-6">{t('unexpectedErrorDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('retry')}
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            {t('reloadPage')}
          </Button>
        </div>
      </div>
    </div>
  );
}
