import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ApiTokensService } from './api-tokens.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { DEFAULT_USER_PERMISSIONS } from 'src/users/access-control.types';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const { useApiTokens: _omit, ...noPermissions } = DEFAULT_USER_PERMISSIONS;

const admin = { id: 1, username: 'root', role: 'ADMIN', isActive: true, permissions: null, serverAccess: null } as any;
const user = (permissions = {}, serverAccess = ['a']) => ({ id: 2, username: 'bob', role: 'USER', isActive: true, permissions: { ...DEFAULT_USER_PERMISSIONS, useApiTokens: true, ...permissions }, serverAccess }) as any;

describe('ApiTokensService', () => {
  let repo: Record<string, jest.Mock>;
  let service: ApiTokensService;

  beforeEach(() => {
    repo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 7, createdAt: new Date(0), ...value })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    service = new ApiTokensService(repo as any, new AccessControlService());
  });

  describe('create', () => {
    it('returns the secret once and stores only its hash', async () => {
      const created = await service.create(user({ viewLogs: true }), { name: ' ci ', permissions: { viewLogs: true }, serverAccess: ['a'] });

      expect(created.token).toMatch(/^mp_[\w-]{43}$/);
      expect(created).toMatchObject({ id: 7, name: 'ci', prefix: created.token.slice(0, 8), admin: false, readOnly: false, serverAccess: ['a'] });
      expect(created.permissions).toEqual({ ...noPermissions, viewLogs: true });
      const stored = repo.save.mock.calls[0][0];
      expect(stored.tokenHash).toBe(sha256(created.token));
      expect(JSON.stringify(stored)).not.toContain(created.token);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 89 * 86_400_000);
    });

    it('honours explicit expiry and no expiry', async () => {
      await service.create(admin, { name: 'a', permissions: {}, serverAccess: [], expiresInDays: 30 });
      expect(repo.save.mock.calls[0][0].expiresAt.getTime()).toBeLessThan(Date.now() + 31 * 86_400_000);

      await service.create(admin, { name: 'b', admin: true, readOnly: true, permissions: {}, serverAccess: [], expiresInDays: null });
      expect(repo.save.mock.calls[1][0]).toMatchObject({ expiresAt: null, admin: true, readOnly: true });
    });

    it('rejects users without useApiTokens', async () => {
      await expect(service.create(user({ useApiTokens: false }), { name: 'x', permissions: {}, serverAccess: [] })).rejects.toThrow(ForbiddenException);
    });

    it('rejects grants beyond the user', async () => {
      await expect(service.create(user(), { name: 'x', admin: true, permissions: {}, serverAccess: [] })).rejects.toThrow('Only admins');
      await expect(service.create(user(), { name: 'x', permissions: { useConsole: true }, serverAccess: [] })).rejects.toThrow('useConsole');
      await expect(service.create(user(), { name: 'x', permissions: {}, serverAccess: ['a', 'b'] })).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('never stores useApiTokens on a token', async () => {
      await service.create(admin, { name: 'x', permissions: { useApiTokens: true }, serverAccess: [] });
      expect(repo.save.mock.calls[0][0].permissions).not.toHaveProperty('useApiTokens');
    });
  });

  it('lists own tokens and all tokens without secrets', async () => {
    const row = { id: 3, userId: 2, user: { username: 'bob' }, name: 'n', prefix: 'mp_abcde', tokenHash: 'h', admin: false, readOnly: true, permissions: noPermissions, serverAccess: [], expiresAt: null, lastUsedAt: null, createdAt: new Date(0) };
    repo.find.mockResolvedValue([row]);

    const own = await service.listOwn(2);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: 2 }, order: { createdAt: 'DESC' } });
    expect(own[0]).not.toHaveProperty('tokenHash');

    expect(await service.listAll()).toEqual([expect.objectContaining({ id: 3, userId: 2, username: 'bob' })]);
    repo.find.mockResolvedValue([{ ...row, user: undefined }]);
    expect((await service.listAll())[0].username).toBeNull();
  });

  it('revokes own tokens, or any token as admin', async () => {
    repo.findOne.mockResolvedValue({ id: 3, userId: 5 });
    await expect(service.revoke(user(), 3)).rejects.toThrow(NotFoundException);
    expect(await service.revoke(admin, 3)).toEqual({ id: 3, userId: 5 });
    expect(repo.delete).toHaveBeenCalledWith(3);

    repo.findOne.mockResolvedValue(null);
    await expect(service.revoke(admin, 9)).rejects.toThrow(NotFoundException);
  });

  describe('authenticate', () => {
    const row = (overrides = {}) => ({ id: 3, user: user(), admin: true, readOnly: false, permissions: noPermissions, serverAccess: ['a'], expiresAt: null, lastUsedAt: null, ...overrides });

    it('resolves the payload and records usage at most once a minute', async () => {
      repo.findOne.mockResolvedValue(row());
      expect(await service.authenticate('mp_x')).toEqual({
        userId: 2,
        username: 'bob',
        role: 'USER',
        apiToken: { id: 3, admin: true, readOnly: false, permissions: noPermissions, serverAccess: ['a'] },
      });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { tokenHash: sha256('mp_x') }, relations: { user: true } });
      expect(repo.update).toHaveBeenCalledWith(3, { lastUsedAt: expect.any(Date) });

      repo.update.mockClear();
      repo.findOne.mockResolvedValue(row({ lastUsedAt: new Date() }));
      await service.authenticate('mp_x');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('gives ADMIN only to admin tokens of admins', async () => {
      repo.findOne.mockResolvedValue(row({ user: admin }));
      expect((await service.authenticate('mp_x')).role).toBe('ADMIN');
      repo.findOne.mockResolvedValue(row({ user: admin, admin: false }));
      expect((await service.authenticate('mp_x')).role).toBe('USER');
    });

    it.each([
      ['unknown', null],
      ['expired', row({ expiresAt: new Date(Date.now() - 1000) })],
      ['inactive user', row({ user: { ...user(), isActive: false } })],
      ['user lost useApiTokens', row({ user: user({ useApiTokens: false }) })],
    ])('rejects %s tokens', async (_label, value) => {
      repo.findOne.mockResolvedValue(value);
      await expect(service.authenticate('mp_x')).rejects.toThrow(UnauthorizedException);
    });
  });
});
