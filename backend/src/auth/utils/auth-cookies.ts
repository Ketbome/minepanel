import { CookieOptions, Response } from 'express';

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function shouldUseSecureCookies(): boolean {
  return process.env.ALLOW_INSECURE_AUTH_COOKIES !== 'true';
}

export function authCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    maxAge,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, expiresInSeconds: number): void {
  res.cookie('access_token', accessToken, authCookieOptions(expiresInSeconds * 1000));
  res.cookie('refresh_token', refreshToken, authCookieOptions(REFRESH_TOKEN_MAX_AGE));
}

export const OIDC_TX_COOKIE = 'oidc_tx';
export const OIDC_TX_MAX_AGE = 10 * 60 * 1000; // 10 minutes
