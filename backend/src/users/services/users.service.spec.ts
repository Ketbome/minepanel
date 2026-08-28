import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(async (value: string, hash: string) => hash === `hashed:${value}`),
}));

import { UsersService } from './users.service';
import { DEFAULT_USER_PERMISSIONS, FULL_ACCESS_PERMISSIONS } from '../access-control.types';
import { Users } from '../entities/users.entity';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const makeRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((data) => ({ ...data })),
  save: jest.fn(async (entity) => ({ id: 1, ...entity })),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn(),
});

const user = (overrides: Partial<Users> = {}): Users =>
  ({
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    password: 'hashed:secret',
    oidcSubject: null,
    role: 'USER',
    isActive: true,
    permissions: { ...DEFAULT_USER_PERMISSIONS },
    serverAccess: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Users;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: ReturnType<typeof makeRepo>;
  let settingsRepo: ReturnType<typeof makeRepo>;
  let invitationsRepo: ReturnType<typeof makeRepo>;
  let pendingEmailRepo: ReturnType<typeof makeRepo>;
  let configService: { get: jest.Mock };
  let authMail: { isConfigured: jest.Mock; sendEmailChangeCodeEmail: jest.Mock };
  let instanceSettings: { getOidc: jest.Mock };

  beforeEach(() => {
    usersRepo = makeRepo();
    settingsRepo = makeRepo();
    invitationsRepo = makeRepo();
    pendingEmailRepo = makeRepo();
    configService = { get: jest.fn().mockReturnValue('https://panel.example.com') };
    authMail = { isConfigured: jest.fn().mockResolvedValue(true), sendEmailChangeCodeEmail: jest.fn().mockResolvedValue(undefined) };
    instanceSettings = { getOidc: jest.fn().mockResolvedValue({ enabled: false, disablePasswordLogin: false }) };

    service = new UsersService(
      usersRepo as any,
      settingsRepo as any,
      invitationsRepo as any,
      pendingEmailRepo as any,
      configService as any,
      authMail as any,
      instanceSettings as any,
    );
  });

  describe('lookups', () => {
    it('delegates simple finders to the repository', async () => {
      const u = user();
      usersRepo.find.mockResolvedValue([u]);
      usersRepo.findOne.mockResolvedValue(u);

      expect(await service.getUsers()).toEqual([u]);
      expect(await service.getUserById(1)).toBe(u);
      expect(await service.getUserByUsername('alice')).toBe(u);
      expect(await service.getUserByEmail(' Alice@Example.com ')).toBe(u);
      expect(usersRepo.findOne).toHaveBeenLastCalledWith({ where: { email: 'alice@example.com' } });
    });

    it('searches by username or normalized email', async () => {
      await service.getUserByUsernameOrEmail(' Bob@Example.com ');
      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: [{ username: 'Bob@Example.com' }, { email: 'bob@example.com' }] });
    });

    it('getRequiredUserById throws when missing', async () => {
      await expect(service.getRequiredUserById(9)).rejects.toThrow(NotFoundException);
    });

    it('hasUsers reflects the count', async () => {
      usersRepo.count.mockResolvedValue(2);
      expect(await service.hasUsers()).toBe(true);
    });
  });

  describe('createUser', () => {
    it('hashes the password, normalizes fields and creates settings', async () => {
      const created = await service.createUser({ username: ' bob ', email: 'Bob@Example.com', password: 'secret12' });

      expect(usersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'bob', email: 'bob@example.com', password: 'hashed:secret12', role: 'USER', permissions: DEFAULT_USER_PERMISSIONS }),
      );
      expect(settingsRepo.save).toHaveBeenCalledWith({ userId: 1 });
      expect(created.id).toBe(1);
    });

    it('stores a null email when none is given', async () => {
      await service.createUser({ username: 'bob', password: 'secret12' });
      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
    });

    it('rejects an email already in use', async () => {
      usersRepo.findOne.mockResolvedValue(user({ id: 7 }));
      await expect(service.createUser({ username: 'bob', email: 'alice@example.com', password: 'secret12' })).rejects.toThrow(ConflictException);
    });
  });

  describe('createInitialAdmin', () => {
    it('refuses when users already exist', async () => {
      usersRepo.count.mockResolvedValue(1);
      await expect(service.createInitialAdmin({ username: 'a', email: 'a@x.com', password: 'secret12' })).rejects.toThrow(ConflictException);
    });

    it('creates an admin with full permissions', async () => {
      await service.createInitialAdmin({ username: 'root', email: 'Root@X.com', password: 'secret12' });
      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN', permissions: FULL_ACCESS_PERMISSIONS, email: 'root@x.com' }));
      expect(settingsRepo.save).toHaveBeenCalled();
    });
  });

  describe('findOrProvisionOidcUser', () => {
    it('returns the user linked by subject', async () => {
      const u = user({ oidcSubject: 'sub-1' });
      usersRepo.findOne.mockResolvedValueOnce(u);
      expect(await service.findOrProvisionOidcUser({ sub: 'sub-1' })).toBe(u);
    });

    it('rejects a disabled user linked by subject', async () => {
      usersRepo.findOne.mockResolvedValueOnce(user({ isActive: false }));
      await expect(service.findOrProvisionOidcUser({ sub: 'sub-1' })).rejects.toThrow(UnauthorizedException);
    });

    it('links an existing user by email', async () => {
      const u = user();
      usersRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(u);
      await service.findOrProvisionOidcUser({ sub: 'sub-2', email: 'Alice@Example.com' });
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, oidcSubject: 'sub-2' }));
    });

    it('rejects a disabled user matched by email', async () => {
      usersRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user({ isActive: false }));
      await expect(service.findOrProvisionOidcUser({ sub: 'sub-2', email: 'alice@example.com' })).rejects.toThrow(UnauthorizedException);
    });

    it('provisions the first user as admin with a unique username', async () => {
      usersRepo.findOne
        .mockResolvedValueOnce(null) // by subject
        .mockResolvedValueOnce(null) // by email
        .mockResolvedValueOnce(user()) // username taken
        .mockResolvedValueOnce(null); // username free
      usersRepo.count.mockResolvedValue(0);

      await service.findOrProvisionOidcUser({ sub: 'sub-3', email: 'new@example.com', username: 'New User' });

      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'New-User-1', role: 'ADMIN', permissions: FULL_ACCESS_PERMISSIONS, password: null }));
      expect(settingsRepo.save).toHaveBeenCalled();
    });

    it('derives the username from the email or the subject', async () => {
      usersRepo.count.mockResolvedValue(3);
      await service.findOrProvisionOidcUser({ sub: 'abcdefgh12345', email: 'mail.name@example.com' });
      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'mail.name', role: 'USER' }));

      await service.findOrProvisionOidcUser({ sub: 'abcdefgh12345' });
      expect(usersRepo.create).toHaveBeenLastCalledWith(expect.objectContaining({ username: 'user-abcdefgh' }));
    });
  });

  describe('updates', () => {
    it('updateUserByUsername drops the password and normalizes the email', async () => {
      const u = user();
      usersRepo.findOne.mockResolvedValueOnce(u).mockResolvedValueOnce(u);
      await service.updateUserByUsername('alice', { email: 'New@Example.com', password: 'x' });
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com', password: 'hashed:secret' }));
    });

    it('updateUserByUsername throws when missing', async () => {
      await expect(service.updateUserByUsername('nobody', {})).rejects.toThrow(NotFoundException);
    });

    it('updateUser keeps the email when not provided', async () => {
      usersRepo.findOne.mockResolvedValueOnce(user());
      await service.updateUser(1, { username: 'renamed' });
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ username: 'renamed', email: 'alice@example.com' }));
    });

    it('updateUser throws when missing', async () => {
      await expect(service.updateUser(1, {})).rejects.toThrow(NotFoundException);
    });

    it('updateProfile normalizes the email', async () => {
      usersRepo.findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);
      await service.updateProfile(1, { email: 'Z@Example.com' });
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'z@example.com' }));
    });

    it('updateProfile throws when missing', async () => {
      await expect(service.updateProfile(1, { email: 'z@example.com' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserRole', () => {
    it('returns the user unchanged when the role matches', async () => {
      const u = user();
      usersRepo.findOne.mockResolvedValue(u);
      expect(await service.updateUserRole(1, 'USER')).toBe(u);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('promotes to admin with full permissions', async () => {
      usersRepo.findOne.mockResolvedValue(user({ serverAccess: ['a'] }));
      await service.updateUserRole(1, 'ADMIN');
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN', permissions: FULL_ACCESS_PERMISSIONS, serverAccess: [] }));
    });

    it('refuses to demote the last active admin', async () => {
      const admin = user({ role: 'ADMIN' });
      usersRepo.findOne.mockResolvedValue(admin);
      usersRepo.find.mockResolvedValue([admin]);
      await expect(service.updateUserRole(1, 'USER')).rejects.toThrow(BadRequestException);
    });

    it('refuses a demotion that leaves no SSO-capable admin when password login is off', async () => {
      const admin = user({ id: 1, role: 'ADMIN', oidcSubject: 'sso' });
      usersRepo.findOne.mockResolvedValue(admin);
      usersRepo.find.mockResolvedValue([admin, user({ id: 2, role: 'ADMIN' })]);
      instanceSettings.getOidc.mockResolvedValue({ enabled: true, disablePasswordLogin: true });
      await expect(service.updateUserRole(1, 'USER')).rejects.toThrow(/single sign-on/);
    });

    it('demotes when another admin remains', async () => {
      const admin = user({ id: 1, role: 'ADMIN' });
      usersRepo.findOne.mockResolvedValue(admin);
      usersRepo.find.mockResolvedValue([admin, user({ id: 2, role: 'ADMIN' })]);
      await service.updateUserRole(1, 'USER');
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: 'USER', permissions: DEFAULT_USER_PERMISSIONS }));
    });

    it('hasSsoCapableAdmin checks linked subjects', async () => {
      usersRepo.find.mockResolvedValue([user({ role: 'ADMIN' })]);
      expect(await service.hasSsoCapableAdmin()).toBe(false);
      usersRepo.find.mockResolvedValue([user({ role: 'ADMIN', oidcSubject: 'x' })]);
      expect(await service.hasSsoCapableAdmin()).toBe(true);
    });
  });

  describe('updateUserAccess', () => {
    it('rejects admins', async () => {
      usersRepo.findOne.mockResolvedValue(user({ role: 'ADMIN' }));
      await expect(service.updateUserAccess(1, { isActive: false })).rejects.toThrow(BadRequestException);
    });

    it('updates active flag and permissions, clearing server access for accessAllServers', async () => {
      usersRepo.findOne.mockResolvedValue(user({ serverAccess: ['a'] }));
      await service.updateUserAccess(1, { isActive: false, permissions: { accessAllServers: true } }, true);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false, serverAccess: [], permissions: expect.objectContaining({ accessAllServers: true }) }));
    });

    it('does not let a non-admin actor grant admin-only permissions', async () => {
      usersRepo.findOne.mockResolvedValue(user());
      await service.updateUserAccess(1, { permissions: { changeServerVersion: true, viewLogs: true }, serverAccess: [' s1 ', 's1', ''] }, false);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ permissions: expect.objectContaining({ changeServerVersion: false, viewLogs: true }), serverAccess: ['s1'] }));
    });

    it('updates only the server access list', async () => {
      usersRepo.findOne.mockResolvedValue(user());
      await service.updateUserAccess(1, { serverAccess: ['b', 'a'] });
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ serverAccess: ['b', 'a'] }));
    });

    it('ignores the list when the stored permissions already grant all servers', async () => {
      usersRepo.findOne.mockResolvedValue(user({ permissions: { ...DEFAULT_USER_PERMISSIONS, accessAllServers: true } }));
      await service.updateUserAccess(1, { serverAccess: ['b'] });
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ serverAccess: [] }));
    });
  });

  describe('email change flow', () => {
    it('requires an email', async () => {
      usersRepo.findOne.mockResolvedValue(user());
      await expect(service.requestEmailChange(1, { email: '' })).rejects.toThrow(BadRequestException);
    });

    it('is a no-op when the email is unchanged', async () => {
      const u = user();
      usersRepo.findOne.mockResolvedValueOnce(u).mockResolvedValueOnce(u);
      expect(await service.requestEmailChange(1, { email: 'Alice@Example.com' })).toEqual({ requiresConfirmation: false, user: u });
    });

    it('applies the change directly when mail is not configured', async () => {
      usersRepo.findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);
      authMail.isConfigured.mockResolvedValue(false);
      const result = await service.requestEmailChange(1, { email: 'new@example.com' });
      expect(result.requiresConfirmation).toBe(false);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
    });

    it('stores a pending change and emails a code', async () => {
      usersRepo.findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);
      const result = await service.requestEmailChange(1, { email: 'new@example.com' });
      expect(result).toEqual({ requiresConfirmation: true, pendingEmail: 'new@example.com' });
      expect(pendingEmailRepo.update).toHaveBeenCalledWith({ userId: 1, usedAt: null }, { usedAt: expect.any(Date) });
      expect(authMail.sendEmailChangeCodeEmail).toHaveBeenCalledWith('new@example.com', 'alice', expect.stringMatching(/^\d{6}$/));
    });

    it('rolls back the pending change when the mail fails', async () => {
      usersRepo.findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);
      authMail.sendEmailChangeCodeEmail.mockRejectedValue(new Error('smtp down'));
      await expect(service.requestEmailChange(1, { email: 'new@example.com' })).rejects.toThrow(InternalServerErrorException);
      expect(pendingEmailRepo.delete).toHaveBeenCalledWith(1);
    });

    it('confirmEmailChange rejects missing, expired and wrong codes', async () => {
      await expect(service.confirmEmailChange(1, '123456')).rejects.toThrow(BadRequestException);

      pendingEmailRepo.findOne.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), codeHash: sha256('123456') });
      await expect(service.confirmEmailChange(1, '123456')).rejects.toThrow(BadRequestException);

      pendingEmailRepo.findOne.mockResolvedValue({ expiresAt: new Date(Date.now() + 1000), codeHash: sha256('999999') });
      await expect(service.confirmEmailChange(1, '123456')).rejects.toThrow(BadRequestException);
    });

    it('confirmEmailChange applies the pending email and marks it used', async () => {
      const pending = { id: 3, expiresAt: new Date(Date.now() + 1000), codeHash: sha256('123456'), newEmail: 'new@example.com', usedAt: null };
      pendingEmailRepo.findOne.mockResolvedValue(pending);
      usersRepo.findOne.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);

      const updated = await service.confirmEmailChange(1, ' 123456 ');

      expect(updated.email).toBe('new@example.com');
      expect(pendingEmailRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 3, usedAt: expect.any(Date) }));
    });
  });

  describe('deleteUser', () => {
    it('throws when missing or admin', async () => {
      await expect(service.deleteUser(1)).rejects.toThrow(NotFoundException);
      usersRepo.findOne.mockResolvedValue(user({ role: 'ADMIN' }));
      await expect(service.deleteUser(1)).rejects.toThrow(BadRequestException);
    });

    it('deletes regular users', async () => {
      usersRepo.findOne.mockResolvedValue(user());
      await service.deleteUser(1);
      expect(usersRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('access state', () => {
    it('gives admins full access', async () => {
      usersRepo.findOne.mockResolvedValue(user({ role: 'ADMIN' }));
      expect(await service.getUserAccessState(1)).toEqual({ permissions: FULL_ACCESS_PERMISSIONS, serverAccess: [] });
    });

    it('normalizes user permissions and server access', () => {
      expect(service.buildUserAccessState(user({ permissions: null, serverAccess: [' a ', 'a'] }))).toEqual({ permissions: DEFAULT_USER_PERMISSIONS, serverAccess: ['a'] });
      expect(service.buildUserAccessState(user({ permissions: { ...DEFAULT_USER_PERMISSIONS, accessAllServers: true }, serverAccess: ['a'] })).serverAccess).toEqual([]);
    });

    it('serializeUser attaches the access state', () => {
      expect(service.serializeUser(user()).access).toEqual({ permissions: DEFAULT_USER_PERMISSIONS, serverAccess: [] });
    });
  });

  describe('invitations', () => {
    it('getActiveInvitations drops expired ones and marks registered emails as used', async () => {
      const future = new Date(Date.now() + 10_000);
      const past = new Date(Date.now() - 10_000);
      invitationsRepo.find.mockResolvedValue([
        { id: 1, email: 'taken@example.com', expiresAt: future },
        { id: 2, email: null, expiresAt: future },
        { id: 3, email: 'old@example.com', expiresAt: past },
      ]);
      usersRepo.find.mockResolvedValue([user({ email: 'taken@example.com' })]);

      const result = await service.getActiveInvitations();

      expect(result.map((i) => i.id)).toEqual([2]);
      expect(invitationsRepo.update).toHaveBeenCalledWith([1], { usedAt: expect.any(Date) });
    });

    it('getActiveInvitations skips the user lookup when no emails are present', async () => {
      invitationsRepo.find.mockResolvedValue([{ id: 2, email: null, expiresAt: new Date(Date.now() + 10_000) }]);
      const result = await service.getActiveInvitations();
      expect(result).toHaveLength(1);
      expect(usersRepo.find).not.toHaveBeenCalled();
    });

    it('createInvitation invalidates previous invitations for the email and returns a link', async () => {
      const execute = jest.fn().mockResolvedValue(undefined);
      const qb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), execute };
      invitationsRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.createInvitation({ email: 'New@Example.com', permissions: { changeServerVersion: true }, serverAccess: ['s1'] }, false);

      expect(execute).toHaveBeenCalled();
      expect(invitationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', role: 'USER', serverAccess: ['s1'], permissions: expect.objectContaining({ changeServerVersion: false }) }),
      );
      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      expect(result.inviteUrl).toBe(`https://panel.example.com/?inviteToken=${result.token}`);
    });

    it('createInvitation without email skips invalidation and clears server access for full access', async () => {
      const result = await service.createInvitation({ permissions: { accessAllServers: true }, serverAccess: ['s1'] }, true);
      expect(invitationsRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(invitationsRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: null, serverAccess: [] }));
      expect(result.invitation).toBeDefined();
    });

    it('createInvitation fails without FRONTEND_URL', async () => {
      configService.get.mockReturnValue(undefined);
      await expect(service.createInvitation({})).rejects.toThrow(BadRequestException);
    });

    it('getInvitationByToken validates the token state', async () => {
      await expect(service.getInvitationByToken('t')).rejects.toThrow(BadRequestException);
      invitationsRepo.findOne.mockResolvedValue({ usedAt: new Date(), expiresAt: new Date(Date.now() + 1000) });
      await expect(service.getInvitationByToken('t')).rejects.toThrow(BadRequestException);
      invitationsRepo.findOne.mockResolvedValue({ usedAt: null, expiresAt: new Date(Date.now() - 1000) });
      await expect(service.getInvitationByToken('t')).rejects.toThrow(BadRequestException);

      const valid = { usedAt: null, expiresAt: new Date(Date.now() + 1000) };
      invitationsRepo.findOne.mockResolvedValue(valid);
      expect(await service.getInvitationByToken('t')).toBe(valid);
      expect(invitationsRepo.findOne).toHaveBeenLastCalledWith({ where: { tokenHash: sha256('t') } });
    });

    it('acceptInvitation creates the user from the invitation and consumes it', async () => {
      const invitation = { usedAt: null, expiresAt: new Date(Date.now() + 1000), email: 'inv@example.com', role: 'USER', permissions: null, serverAccess: ['s1'] };
      invitationsRepo.findOne.mockResolvedValue(invitation);

      const created = await service.acceptInvitation('t', { username: ' newbie ', password: 'secret12', email: 'ignored@example.com' });

      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'newbie', email: 'inv@example.com', permissions: DEFAULT_USER_PERMISSIONS, serverAccess: ['s1'] }));
      expect(settingsRepo.save).toHaveBeenCalledWith({ userId: 1 });
      expect(invitationsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ usedAt: expect.any(Date) }));
      expect(created.id).toBe(1);
    });

    it('acceptInvitation falls back to the submitted email', async () => {
      invitationsRepo.findOne.mockResolvedValue({ usedAt: null, expiresAt: new Date(Date.now() + 1000), email: null, role: 'USER' });
      await service.acceptInvitation('t', { username: 'n', password: 'secret12', email: 'Mine@Example.com' });
      expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'mine@example.com' }));
    });

    it('getInvitationLink rotates the token', async () => {
      const invitation = { id: 4, email: null, usedAt: null, expiresAt: new Date(Date.now() + 1000), tokenHash: 'old' };
      invitationsRepo.findOne.mockResolvedValue(invitation);

      const link = await service.getInvitationLink(4);

      expect(link).toMatch(/inviteToken=[a-f0-9]{64}$/);
      expect(invitation.tokenHash).not.toBe('old');
      expect(invitationsRepo.save).toHaveBeenCalledWith(invitation);
    });

    it('getInvitationLink rejects missing or expired invitations', async () => {
      await expect(service.getInvitationLink(4)).rejects.toThrow(NotFoundException);
      invitationsRepo.findOne.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), usedAt: null });
      await expect(service.getInvitationLink(4)).rejects.toThrow(NotFoundException);
    });

    it('getInvitationLink retires an invitation whose email is now registered', async () => {
      const invitation = { id: 4, email: 'taken@example.com', usedAt: null, expiresAt: new Date(Date.now() + 1000) };
      invitationsRepo.findOne.mockResolvedValue(invitation);
      usersRepo.findOne.mockResolvedValue(user({ email: 'taken@example.com' }));

      await expect(service.getInvitationLink(4)).rejects.toThrow(NotFoundException);
      expect(invitationsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 4, usedAt: expect.any(Date) }));
    });
  });

  describe('changePassword', () => {
    it('throws for missing users and SSO-only accounts', async () => {
      await expect(service.changePassword(1, { currentPassword: 'a', newPassword: 'b' })).rejects.toThrow(NotFoundException);
      usersRepo.findOne.mockResolvedValue(user({ password: null }));
      await expect(service.changePassword(1, { currentPassword: 'a', newPassword: 'b' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a wrong current password', async () => {
      usersRepo.findOne.mockResolvedValue(user());
      await expect(service.changePassword(1, { currentPassword: 'nope', newPassword: 'b' })).rejects.toThrow(UnauthorizedException);
    });

    it('stores the new hash', async () => {
      usersRepo.findOne.mockResolvedValue(user());
      const result = await service.changePassword(1, { currentPassword: 'secret', newPassword: 'newpass1' });
      expect(result.message).toMatch(/changed/);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed:newpass1' }));
    });
  });
});
