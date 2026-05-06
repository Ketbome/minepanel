const defaultPublicEnv = {
  NEXT_PUBLIC_BACKEND_URL: '',
  NEXT_PUBLIC_DEFAULT_LANGUAGE: 'en',
} as const;

export type PublicEnvKey = keyof typeof defaultPublicEnv;

declare global {
  interface Window {
    __MINEPANEL_PUBLIC_ENV__?: Partial<Record<PublicEnvKey, string>>;
  }
}

export function getPublicEnv(key: PublicEnvKey) {
  if (typeof window !== 'undefined') {
    return window.__MINEPANEL_PUBLIC_ENV__?.[key] ?? defaultPublicEnv[key];
  }

  return readPublicEnv()[key];
}

export function serializePublicEnv() {
  return JSON.stringify(readPublicEnv()).replace(/</g, '\\u003c');
}

function readPublicEnv() {
  return {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? defaultPublicEnv.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_DEFAULT_LANGUAGE: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ?? defaultPublicEnv.NEXT_PUBLIC_DEFAULT_LANGUAGE,
  } as const;
}
