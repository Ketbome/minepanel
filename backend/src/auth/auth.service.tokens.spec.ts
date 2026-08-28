import { BadRequestException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(async (value: string, hash: string) => hash === `hashed:${value}`),
}));

import { AuthService } from './auth.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthService tokens, recovery and invitations', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock; decode: jest.Mock };
  let usersService: Record<string, jest.Mock>;
  let configService: { get: jest.Mock };
  let authMail: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  let instanceSettings: { getOidc: jest.Mock };
  let refreshRepo: Record<string, jest.Mock>;
  let resetRepo: any;

  beforeEach(() => {
    jwtService = { sign: jest.fn().mockReturnValue('access'), decode: jest.fn().mockReturnValue({ iat: 100, exp: 1000 }) };
    usersService = {
      findOrProvisionOidcUser: jest.fn().mockResolvedValue({ id: 5, username: 'sso', role: 'USER' }),
      createInitialAdmin: jest.fn().mockResolvedValue({ id: 1, username: 'root', role: 'ADMIN' }),
      getUserByEmail: jest.fn(),
      createInvitation: jest.fn(),
      getActiveInvitations: jest.fn(),
      getInvitationLink: jest.fn().mockResolvedValue('https://panel/?inviteToken=t'),
      getInvitationByToken: jest.fn(),
      acceptInvitation: jest.fn().mockResolvedValue({ id: 9, username: 'newbie', role: 'USER' }),
      hasUsers: jest.fn().mockResolvedValue(true),
    };
    configService = { get: jest.fn((key: string) => ({ frontendUrl: 'https://panel.example.com', passwordResetTokenExpiresInMinutes: 30 })[key]) };
    authMail = {
      isConfigured: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendUserInvitationEmail: jest.fn().mockResolvedValue(undefined),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    instanceSettings = { getOidc: jest.fn().mockResolvedValue({ enabled: true, providerName: 'Authentik', disablePasswordLogin: true }) };
    refreshRepo = { delete: jest.fn().mockResolvedValue(undefined), save: jest.fn().mockResolvedValue(undefined), find: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue(undefined) };
    resetRepo = { update: jest.fn().mockResolvedValue(undefined), save: jest.fn().mockResolvedValue(undefined), findOne: jest.fn(), manager: { save: jest.fn().mockResolvedValue(undefined) } };

    service = new AuthService(jwtService as any, usersService as any, configService as any, authMail as any, audit as any, instanceSettings as any, refreshRepo as any, resetRepo as any);
  });

  it('getSetupStatus exposes SSO state', async () => {
    expect(await service.getSetupStatus()).toEqual({
      requiresSetup: false,
      passwordRecoveryEnabled: true,
      sso: { enabled: true, providerName: 'Authentik', passwordLoginDisabled: true, loginUrl: '/auth/oidc/login' },
    });
  });

  it('loginWithOidc and createInitialAdmin issue sessions', async () => {
    const sso = await service.loginWithOidc({ sub: 'x' });
    expect(sso).toMatchObject({ access_token: 'access', username: 'sso', userId: 5, expires_in: 900 });
    expect(refreshRepo.delete).toHaveBeenCalled();
    expect(refreshRepo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 5, revoked: false }));

    jwtService.decode.mockReturnValue(null);
    const admin = await service.createInitialAdmin({ username: 'root', email: 'r@x.com', password: 'secret12' });
    expect(admin.expires_in).toBe(900);
  });

  it('validateRefreshToken rotates a valid token and rejects expired or inactive ones', async () => {
    const future = new Date(Date.now() + 10_000);
    const past = new Date(Date.now() - 10_000);
    refreshRepo.find.mockResolvedValue([
      { id: 1, token: 'hashed:other', expiresAt: future, user: { id: 1, isActive: true } },
      { id: 2, token: 'hashed:mine', expiresAt: future, user: { id: 2, username: 'bob', role: 'USER', isActive: true } },
    ]);
    expect(await service.validateRefreshToken('mine')).toEqual({ userId: 2, username: 'bob', role: 'USER' });
    expect(refreshRepo.update).toHaveBeenCalledWith(2, { revoked: true });

    refreshRepo.find.mockResolvedValue([{ id: 3, token: 'hashed:old', expiresAt: past, user: { isActive: true } }]);
    expect(await service.validateRefreshToken('old')).toBeNull();
    expect(refreshRepo.update).toHaveBeenLastCalledWith(3, { revoked: true });

    refreshRepo.find.mockResolvedValue([{ id: 4, token: 'hashed:dis', expiresAt: future, user: { isActive: false } }]);
    expect(await service.validateRefreshToken('dis')).toBeNull();

    expect(await service.validateRefreshToken('unknown')).toBeNull();
  });

  it('revokeRefreshToken revokes only the matching token', async () => {
    refreshRepo.find.mockResolvedValue([{ id: 1, token: 'hashed:a' }, { id: 2, token: 'hashed:b' }]);
    await service.revokeRefreshToken('b');
    expect(refreshRepo.update).toHaveBeenCalledTimes(1);
    expect(refreshRepo.update).toHaveBeenCalledWith(2, { revoked: true });
    await service.revokeRefreshToken('zzz');
    expect(refreshRepo.update).toHaveBeenCalledTimes(1);
  });

  it('createPasswordReset requires smtp and silently ignores unknown or inactive users', async () => {
    authMail.isConfigured.mockResolvedValueOnce(false);
    await expect(service.createPasswordReset('a@x.com')).rejects.toThrow(ServiceUnavailableException);

    usersService.getUserByEmail.mockResolvedValueOnce(null);
    await service.createPasswordReset('a@x.com');
    usersService.getUserByEmail.mockResolvedValueOnce({ isActive: false, email: 'a@x.com' });
    await service.createPasswordReset('a@x.com');
    expect(resetRepo.save).not.toHaveBeenCalled();
  });

  it('createPasswordReset stores a hashed token with the configured ttl and emails the link', async () => {
    usersService.getUserByEmail.mockResolvedValue({ id: 3, username: 'carol', email: 'c@x.com', isActive: true });

    await service.createPasswordReset('c@x.com');

    expect(resetRepo.update).toHaveBeenCalledWith({ userId: 3, usedAt: null }, { usedAt: expect.any(Date) });
    const saved = resetRepo.save.mock.calls[0][0];
    expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    const [to, username, url] = authMail.sendPasswordResetEmail.mock.calls[0];
    expect([to, username]).toEqual(['c@x.com', 'carol']);
    const token = new URL(url).searchParams.get('resetToken')!;
    expect(saved.tokenHash).toBe(sha256(token));
  });

  it('createPasswordReset wraps mail failures and missing FRONTEND_URL', async () => {
    usersService.getUserByEmail.mockResolvedValue({ id: 3, username: 'carol', email: 'c@x.com', isActive: true });
    authMail.sendPasswordResetEmail.mockRejectedValueOnce(new Error('smtp'));
    await expect(service.createPasswordReset('c@x.com')).rejects.toThrow(InternalServerErrorException);

    // A missing FRONTEND_URL surfaces while building the link, inside the mail try/catch.
    configService.get.mockImplementation((key: string) => (key === 'passwordResetTokenExpiresInMinutes' ? -1 : undefined));
    await expect(service.createPasswordReset('c@x.com')).rejects.toThrow(InternalServerErrorException);
    expect(resetRepo.save.mock.calls.at(-1)[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000);
  });

  it('resetPassword rejects unknown, used, expired tokens and inactive users', async () => {
    const future = new Date(Date.now() + 10_000);
    resetRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.resetPassword('t', 'newpass1')).rejects.toThrow(BadRequestException);
    resetRepo.findOne.mockResolvedValueOnce({ usedAt: new Date(), expiresAt: future, user: { isActive: true } });
    await expect(service.resetPassword('t', 'newpass1')).rejects.toThrow(BadRequestException);
    resetRepo.findOne.mockResolvedValueOnce({ usedAt: null, expiresAt: new Date(Date.now() - 1), user: { isActive: true } });
    await expect(service.resetPassword('t', 'newpass1')).rejects.toThrow(BadRequestException);
    resetRepo.findOne.mockResolvedValueOnce({ usedAt: null, expiresAt: future, user: { isActive: false } });
    await expect(service.resetPassword('t', 'newpass1')).rejects.toThrow(BadRequestException);
    expect(resetRepo.manager.save).not.toHaveBeenCalled();
  });

  it('manages invitations with audit entries', async () => {
    usersService.createInvitation.mockResolvedValue({ invitation: { id: 7, email: null, role: 'USER', permissions: {}, serverAccess: null, expiresAt: new Date() }, inviteUrl: 'u', token: 't' });
    const created = await service.createInvitation({}, { userId: 1, username: 'admin', role: 'ADMIN' }, true);
    expect(created).toMatchObject({ id: 7, emailSent: false, access: { serverAccess: [] } });
    expect(authMail.sendUserInvitationEmail).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invitation', summary: 'Created invitation' }));

    usersService.getActiveInvitations.mockResolvedValue([{ id: 8, email: 'e', role: 'USER', permissions: null, serverAccess: ['s'], expiresAt: new Date(), createdAt: new Date() }]);
    expect(await service.getActiveInvitations()).toEqual([expect.objectContaining({ id: 8, access: { permissions: null, serverAccess: ['s'] } })]);

    expect(await service.getInvitationLink(8, { userId: 1, username: 'admin', role: 'ADMIN' })).toEqual({ inviteUrl: 'https://panel/?inviteToken=t' });
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'copy_invitation_link', metadata: { invitationId: 8 } }));

    usersService.getInvitationByToken.mockResolvedValue({ email: 'e', role: 'USER', permissions: null, serverAccess: null, expiresAt: new Date() });
    expect(await service.getInvitation('t')).toMatchObject({ email: 'e', access: { serverAccess: [] } });

    const session = await service.acceptInvitation('t', 'newbie', 'secret12', 'n@x.com');
    expect(usersService.acceptInvitation).toHaveBeenCalledWith('t', { username: 'newbie', password: 'secret12', email: 'n@x.com' });
    expect(session).toMatchObject({ access_token: 'access', username: 'newbie' });
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'accept_invitation', actorUserId: 9 }));
  });
});
