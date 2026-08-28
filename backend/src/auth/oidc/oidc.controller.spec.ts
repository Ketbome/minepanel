import { NotFoundException } from '@nestjs/common';
import { OidcController } from './oidc.controller';
import { OIDC_TX_COOKIE } from '../utils/auth-cookies';

describe('OidcController', () => {
  let oidcService: Record<string, jest.Mock>;
  let authService: { loginWithOidc: jest.Mock };
  let audit: { record: jest.Mock };
  let controller: OidcController;
  let res: any;

  beforeEach(() => {
    oidcService = {
      isEnabled: jest.fn().mockResolvedValue(true),
      buildLoginUrl: jest.fn().mockResolvedValue({ url: 'https://idp.example.com/auth', tx: 'tx' }),
      handleCallback: jest.fn().mockResolvedValue({ sub: '1', email: 'a@x.com', username: 'alice' }),
      getRedirectUri: jest.fn().mockResolvedValue('https://api.example.com/auth/oidc/callback'),
    };
    authService = { loginWithOidc: jest.fn().mockResolvedValue({ access_token: 'a', refresh_token: 'r', expires_in: 60, userId: 1, username: 'alice' }) };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    controller = new OidcController(oidcService as any, authService as any, audit as any, { get: () => 'https://panel.example.com' } as any);
    res = { cookie: jest.fn(), clearCookie: jest.fn(), redirect: jest.fn() };
  });

  it('login redirects to the provider with the transaction cookie', async () => {
    await controller.login(res);
    expect(res.cookie).toHaveBeenCalledWith(OIDC_TX_COOKIE, 'tx', expect.objectContaining({ httpOnly: true }));
    expect(res.redirect).toHaveBeenCalledWith('https://idp.example.com/auth');
  });

  it('login and callback 404 when SSO is disabled', async () => {
    oidcService.isEnabled.mockResolvedValue(false);
    await expect(controller.login(res)).rejects.toThrow(NotFoundException);
    await expect(controller.callback({ originalUrl: '/x', cookies: {} } as any, res)).rejects.toThrow(NotFoundException);
  });

  it('callback issues session cookies and redirects to the dashboard', async () => {
    const req = { originalUrl: '/auth/oidc/callback?code=abc&state=s', cookies: { [OIDC_TX_COOKIE]: 'tx' } } as any;

    await controller.callback(req, res);

    const [url, tx] = oidcService.handleCallback.mock.calls[0];
    expect(url.toString()).toBe('https://api.example.com/auth/oidc/callback?code=abc&state=s');
    expect(tx).toBe('tx');
    expect(res.clearCookie).toHaveBeenCalledWith(OIDC_TX_COOKIE);
    expect(res.cookie).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'login', actorUserId: 1 }));
    expect(res.redirect).toHaveBeenCalledWith('https://panel.example.com/dashboard/home');
  });

  it('callback failures land on the login page with an error flag', async () => {
    oidcService.handleCallback.mockRejectedValue(new Error('nope'));
    await controller.callback({ originalUrl: '/auth/oidc/callback', cookies: undefined } as any, res);
    expect(res.clearCookie).toHaveBeenCalledWith(OIDC_TX_COOKIE);
    expect(res.redirect).toHaveBeenCalledWith('https://panel.example.com/?ssoError=1');
    expect(audit.record).not.toHaveBeenCalled();
  });
});
