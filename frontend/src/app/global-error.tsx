'use client';

import { useEffect } from 'react';

// Replaces the root layout, so it cannot use providers or global styles.
export default function GlobalError({ error, reset }: { readonly error: Error & { digest?: string }; readonly reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" translate="no">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f14',
          color: '#e5e7eb',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ color: '#f87171', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Minepanel could not load this page</h1>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
            Reloading usually fixes it. If it keeps happening, disable your browser&apos;s automatic page translation and report it at
            github.com/Ketbome/minepanel/issues.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
