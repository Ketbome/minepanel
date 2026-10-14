import { ForbiddenException, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SESSION_ONLY_KEY } from '../decorators/session-only.decorator';
import { TOKEN_ONLY_KEY } from '../decorators/token-only.decorator';

describe('JwtAuthGuard', () => {
  const scope = { id: 1, admin: false, readOnly: false, permissions: {}, serverAccess: [] };
  let metadata: Record<string, boolean>;
  let apiTokens: { authenticate: jest.Mock };
  let guard: JwtAuthGuard;
  let passport: jest.SpyInstance;

  const context = (req: any) => ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) }) as any;
  const request = (overrides: any = {}) => ({ method: 'GET', headers: { authorization: 'Bearer mp_token' }, ...overrides });

  beforeEach(() => {
    metadata = {};
    apiTokens = { authenticate: jest.fn().mockResolvedValue({ userId: 2, username: 'bob', role: 'USER', apiToken: scope }) };
    const reflector = { getAllAndOverride: jest.fn((key: string) => metadata[key]) };
    const moduleRef = { get: jest.fn(() => apiTokens) };
    guard = new JwtAuthGuard(reflector as any, moduleRef as any);
    passport = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockResolvedValue(true);
  });

  afterEach(() => passport.mockRestore());

  it('lets public routes through', async () => {
    metadata[IS_PUBLIC_KEY] = true;
    expect(await guard.canActivate(context(request()))).toBe(true);
    expect(apiTokens.authenticate).not.toHaveBeenCalled();
  });

  it('authenticates mp_ bearers without passport', async () => {
    const req = request();
    expect(await guard.canActivate(context(req))).toBe(true);
    expect(apiTokens.authenticate).toHaveBeenCalledWith('mp_token');
    expect(req.user).toMatchObject({ userId: 2, apiToken: scope });
    expect(passport).not.toHaveBeenCalled();

    await guard.canActivate(context(req));
    expect(apiTokens.authenticate).toHaveBeenCalledTimes(1);
  });

  it('propagates token authentication failures', async () => {
    apiTokens.authenticate.mockRejectedValue(new HttpException('Unauthorized', 401));
    await expect(guard.canActivate(context(request()))).rejects.toThrow('Unauthorized');
  });

  it('blocks tokens on session-only routes', async () => {
    metadata[SESSION_ONLY_KEY] = true;
    await expect(guard.canActivate(context(request()))).rejects.toThrow(ForbiddenException);
  });

  it('keeps read-only tokens to GET/HEAD, except on token-only routes', async () => {
    apiTokens.authenticate.mockResolvedValue({ userId: 2, apiToken: { ...scope, readOnly: true } });
    await expect(guard.canActivate(context(request({ method: 'POST' })))).rejects.toThrow('read-only');
    expect(await guard.canActivate(context(request({ method: 'HEAD' })))).toBe(true);

    metadata[TOKEN_ONLY_KEY] = true;
    expect(await guard.canActivate(context(request({ method: 'POST' })))).toBe(true);
  });

  it('falls back to the JWT strategy for other credentials', async () => {
    expect(await guard.canActivate(context(request({ headers: { authorization: 'Bearer eyJ' } })))).toBe(true);
    expect(await guard.canActivate(context(request({ headers: {} })))).toBe(true);
    expect(passport).toHaveBeenCalledTimes(2);
  });

  it('rejects cookie and JWT sessions on token-only routes', async () => {
    metadata[TOKEN_ONLY_KEY] = true;
    await expect(guard.canActivate(context(request({ headers: { authorization: 'Bearer eyJ' } })))).rejects.toThrow(HttpException);
    await expect(guard.canActivate(context(request({ headers: {}, cookies: { access_token: 'jwt' } })))).rejects.toThrow(HttpException);
    expect(passport).not.toHaveBeenCalled();
  });

  it('turns passport failures into 401', () => {
    expect(() => guard.handleRequest(null, null, null)).toThrow(HttpException);
    expect(guard.handleRequest(null, { userId: 1 }, null)).toEqual({ userId: 1 });
  });
});
