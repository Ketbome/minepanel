'use client';

import { useCallback, useEffect, useState } from 'react';
import { Blackout } from './blackout';
import { BLACKOUT_EVENT } from './index';
import './halloween.css';

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

// Mounted once while the season is on: recolors the panel, lays the fog and listens for the
// ways into the blackout (the Konami code anywhere outside a text field, or the pumpkin).
export function Layer() {
  const [dark, setDark] = useState(false);
  const lightsOn = useCallback(() => setDark(false), []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.season = 'halloween';
    return () => {
      delete root.dataset.season;
    };
  }, []);

  useEffect(() => {
    let step = 0;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor')) return;
      const key = e.key.toLowerCase();
      step = key === KONAMI[step] ? step + 1 : key === KONAMI[0] ? 1 : 0;
      if (step === KONAMI.length) {
        step = 0;
        setDark(true);
      }
    };
    const onBlackout = () => setDark(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(BLACKOUT_EVENT, onBlackout);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(BLACKOUT_EVENT, onBlackout);
    };
  }, []);

  return (
    <>
      <div className="hw-fog" aria-hidden="true">
        <i />
        <i />
      </div>
      {dark && <Blackout onDone={lightsOn} />}
    </>
  );
}
