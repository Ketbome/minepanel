import { serializePublicEnv } from '@/lib/public-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  return new Response(`window.__MINEPANEL_PUBLIC_ENV__=${serializePublicEnv()};`, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
