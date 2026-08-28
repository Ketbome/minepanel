import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OidcService } from './oidc.service';

describe('OidcService', () => {
  const oidc = { enabled: true, issuer: 'https://idp.example.com', clientId: 'id', clientSecret: 'secret', redirectUri: 'https://api.example.com/auth/oidc/callback', scopes: 'openid email' };
  let instanceSettings: { getOidc: jest.Mock; registerResetHandler: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let client: Record<string, jest.Mock>;
  let service: OidcService;
  let resetHandler: () => void;

  beforeEach(() => {
    instanceSettings = {
      getOidc: jest.fn().mockResolvedValue(oidc),
      registerResetHandler: jest.fn((handler) => {
        resetHandler = handler;
      }),
    };
    jwtService = { sign: jest.fn().mockReturnValue('tx-token'), verify: jest.fn() };
    client = {
      randomPKCECodeVerifier: jest.fn().mockReturnValue('verifier'),
      calculatePKCECodeChallenge: jest.fn().mockResolvedValue('challenge'),
      randomState: jest.fn().mockReturnValue('state'),
      randomNonce: jest.fn().mockReturnValue('nonce'),
      buildAuthorizationUrl: jest.fn().mockReturnValue(new URL('https://idp.example.com/auth?client_id=id')),
      discovery: jest.fn().mockResolvedValue('configuration'),
      authorizationCodeGrant: jest.fn(),
    };
    service = new OidcService(instanceSettings as any, jwtService as any);
    // openid-client is ESM-only and loaded through a dynamic import; inject the fake instead.
    (service as any).clientPromise = Promise.resolve(client);
  });

  it('reports whether SSO is enabled', async () => {
    expect(await service.isEnabled()).toBe(true);
    instanceSettings.getOidc.mockResolvedValue({ enabled: false });
    expect(await service.isEnabled()).toBe(false);
  });

  it('refuses to build a login url when SSO is off', async () => {
    instanceSettings.getOidc.mockResolvedValue({ enabled: false });
    await expect(service.buildLoginUrl()).rejects.toThrow(ServiceUnavailableException);
    await expect(service.getRedirectUri()).rejects.toThrow(ServiceUnavailableException);
  });

  it('builds a PKCE login url and a signed transaction', async () => {
    const result = await service.buildLoginUrl();

    expect(client.discovery).toHaveBeenCalledWith(new URL(oidc.issuer), 'id', 'secret');
    expect(client.buildAuthorizationUrl).toHaveBeenCalledWith('configuration', {
      redirect_uri: oidc.redirectUri,
      scope: 'openid email',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      state: 'state',
      nonce: 'nonce',
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ state: 'state', nonce: 'nonce', codeVerifier: 'verifier' }, { expiresIn: '10m' });
    expect(result).toEqual({ url: 'https://idp.example.com/auth?client_id=id', tx: 'tx-token' });
    expect(await service.getRedirectUri()).toBe(oidc.redirectUri);
  });

  it('caches the discovered configuration until settings change', async () => {
    await service.buildLoginUrl();
    await service.buildLoginUrl();
    expect(client.discovery).toHaveBeenCalledTimes(1);

    resetHandler();
    await service.buildLoginUrl();
    expect(client.discovery).toHaveBeenCalledTimes(2);
  });

  it('validates the transaction cookie on callback', async () => {
    await expect(service.handleCallback(new URL('https://api.example.com/cb'), undefined)).rejects.toThrow(UnauthorizedException);
    jwtService.verify.mockImplementation(() => {
      throw new Error('expired');
    });
    await expect(service.handleCallback(new URL('https://api.example.com/cb'), 'bad')).rejects.toThrow('Invalid OIDC transaction');
  });

  it('exchanges the code and maps the claims to a profile', async () => {
    jwtService.verify.mockReturnValue({ state: 'state', nonce: 'nonce', codeVerifier: 'verifier' });
    const url = new URL('https://api.example.com/auth/oidc/callback?code=abc&state=state');
    client.authorizationCodeGrant.mockResolvedValue({ claims: () => ({ sub: 42, email: 'a@x.com', preferred_username: 'alice' }) });

    expect(await service.handleCallback(url, 'tx')).toEqual({ sub: '42', email: 'a@x.com', username: 'alice' });
    expect(client.authorizationCodeGrant).toHaveBeenCalledWith('configuration', url, {
      pkceCodeVerifier: 'verifier',
      expectedState: 'state',
      expectedNonce: 'nonce',
      idTokenExpected: true,
    });

    client.authorizationCodeGrant.mockResolvedValue({ claims: () => ({ sub: 'x', nickname: 'nick', email: 7 }) });
    expect(await service.handleCallback(url, 'tx')).toEqual({ sub: 'x', email: null, username: 'nick' });

    client.authorizationCodeGrant.mockResolvedValue({ claims: () => ({ sub: 'x', name: 'Full Name' }) });
    expect((await service.handleCallback(url, 'tx')).username).toBe('Full Name');

    client.authorizationCodeGrant.mockResolvedValue({ claims: () => ({ sub: 'x', name: 5 }) });
    expect((await service.handleCallback(url, 'tx')).username).toBeNull();

    client.authorizationCodeGrant.mockResolvedValue({ claims: () => undefined });
    await expect(service.handleCallback(url, 'tx')).rejects.toThrow('missing subject');
  });
});
