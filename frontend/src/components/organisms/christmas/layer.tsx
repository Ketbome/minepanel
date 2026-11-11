'use client';

import { useCallback, useEffect, useState } from 'react';
import { Storm } from './storm';
import './christmas.css';

export const STORM_EVENT = 'minepanel:snowstorm';

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

// Mounted once while the season is on: recolors the panel, lets the snow fall and listens for
// the ways into the storm (the Konami code anywhere outside a text field, or the tree).
export function Layer() {
  const [storm, setStorm] = useState(false);
  const clear = useCallback(() => setStorm(false), []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.season = 'christmas';
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
        setStorm(true);
      }
    };
    const onStorm = () => setStorm(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(STORM_EVENT, onStorm);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(STORM_EVENT, onStorm);
    };
  }, []);

  return (
    <>
      <div className="xm-snow" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {storm && <Storm onDone={clear} />}
    </>
  );
}
