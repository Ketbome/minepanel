'use client';

import { m } from 'framer-motion';
import { useEffect } from 'react';
import { GitHubStarButton } from '@/components/molecules/GitHubStarButton';
import { Button } from '@/components/ui/button';
import { useLore } from './lore';

// The last screen of either ending: the admins' thanks for supporting Minepanel, with the star
// button and a word on sharing it.
export function Thanks({ onClose, onVisit }: { readonly onClose: () => void; readonly onVisit: () => void }) {
  const lore = useLore();

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={lore('thanksTitle')}
      className="absolute inset-0 z-[48] flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1 } }}
    >
      <div className="mc-panel w-full max-w-md">
        <div className="mc-titlebar px-4 py-2">
          <h2 className="font-minecraft text-base text-gray-100">{lore('thanksTitle')}</h2>
        </div>
        <div className="space-y-3 p-4 text-sm leading-relaxed text-gray-300">
          {lore('thanksBody')
            .split('\n')
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          <p className="text-[11px] text-gray-500">— Ketbome, BlasterDaster & Bfuuny</p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <GitHubStarButton label={lore('thanksStar')} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={onVisit}>
                {lore('thanksServer48')}
              </Button>
              <Button variant="minepanel" onClick={onClose} autoFocus>
                {lore('thanksClose')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
