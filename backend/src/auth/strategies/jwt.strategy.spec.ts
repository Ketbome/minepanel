import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let usersService: { getUserById: jest.Mock };
  let strategy: JwtStrategy;

  beforeEach(() => {
    usersService = { getUserById: jest.fn() };
    const config = { get: jest.fn((key: string) => ({ jwtSecret: 'secret', jwtIssuer: 'minepanel', jwtAudience: 'users' })[key]) };
    strategy = new JwtStrategy(config as any, usersService as any);
  });

  it('extracts the token from the cookie first, then the bearer header', () => {
    const extract = (strategy as any)._jwtFromRequest as (req: any) => string | null;
    expect(extract({ cookies: { access_token: 'cookie' }, headers: { authorization: 'Bearer header' } })).toBe('cookie');
    expect(extract({ cookies: {}, headers: { authorization: 'Bearer header' } })).toBe('header');
    expect(extract({ headers: {} })).toBeNull();
  });

  it('validates that the user still exists and is active', async () => {
    usersService.getUserById.mockResolvedValue({ isActive: true });
    expect(await strategy.validate({ userId: 1, username: 'a', role: 'USER' })).toEqual({ userId: 1, username: 'a', role: 'USER' });

    usersService.getUserById.mockResolvedValue({ isActive: false });
    await expect(strategy.validate({ userId: 1, username: 'a', role: 'USER' })).rejects.toThrow(UnauthorizedException);
    usersService.getUserById.mockResolvedValue(null);
    await expect(strategy.validate({ userId: 1, username: 'a', role: 'USER' })).rejects.toThrow(UnauthorizedException);
  });
});
