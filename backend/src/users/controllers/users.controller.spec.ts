import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const req = { user: { userId: 1, username: 'admin' } };
  const me = { id: 1, username: 'admin', role: 'ADMIN' };
  let usersService: Record<string, jest.Mock>;
  let accessControl: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      getRequiredUserById: jest.fn().mockResolvedValue(me),
      getUsers: jest.fn().mockResolvedValue([me]),
      serializeUser: jest.fn((user) => ({ ...user, access: 'state' })),
      requestEmailChange: jest.fn(),
      confirmEmailChange: jest.fn(),
      createUser: jest.fn().mockResolvedValue({ id: 2, username: 'bob' }),
      updateUserByUsername: jest.fn().mockResolvedValue({ id: 2, username: 'bob' }),
      updateUser: jest.fn().mockResolvedValue({ id: 2, username: 'bob' }),
      updateUserRole: jest.fn().mockResolvedValue({ id: 2, username: 'bob', role: 'ADMIN' }),
      updateUserAccess: jest.fn().mockResolvedValue({ id: 2, username: 'bob' }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      changePassword: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    accessControl = { assertManageUsers: jest.fn(), assertIsAdmin: jest.fn(), isAdmin: jest.fn().mockReturnValue(true) };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    controller = new UsersController(usersService as any, accessControl as any, audit as any);
  });

  it('lists and returns users serialized', async () => {
    expect(await controller.getUsers(req)).toEqual([{ ...me, access: 'state' }]);
    expect(accessControl.assertManageUsers).toHaveBeenCalledWith(me);
    expect(await controller.getUserById(req)).toEqual({ ...me, access: 'state' });
  });

  it('updateProfile records the right audit entry', async () => {
    usersService.requestEmailChange.mockResolvedValueOnce({ requiresConfirmation: true, pendingEmail: 'n@x.com' });
    expect(await controller.updateProfile(req, { email: 'n@x.com' })).toEqual({ requiresConfirmation: true, pendingEmail: 'n@x.com' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'request_email_change' }));

    usersService.requestEmailChange.mockResolvedValueOnce({ requiresConfirmation: false, user: me });
    expect(await controller.updateProfile(req, { email: 'n@x.com' })).toEqual({ requiresConfirmation: false, user: { ...me, access: 'state' } });
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'update_profile_email' }));
  });

  it('confirmEmailChange audits success and failure', async () => {
    usersService.confirmEmailChange.mockResolvedValueOnce(me);
    expect(await controller.confirmEmailChange(req, { code: '123456' })).toEqual({ ...me, access: 'state' });
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'confirm_email_change' }));

    usersService.confirmEmailChange.mockRejectedValueOnce(new BadRequestException('bad code'));
    await expect(controller.confirmEmailChange(req, { code: 'x' })).rejects.toThrow(BadRequestException);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'confirm_email_change_failed', outcome: 'error' }));

    usersService.confirmEmailChange.mockRejectedValueOnce(new Error('db'));
    await expect(controller.confirmEmailChange(req, { code: 'x' })).rejects.toThrow('db');
  });

  it('creates, updates and deletes users behind manageUsers', async () => {
    expect(await controller.createUser(req, { username: 'bob', password: 'secret12' })).toMatchObject({ id: 2 });
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'create_user', metadata: { targetUserId: 2, targetUsername: 'bob' } }));

    expect(await controller.updateUserByUsername(req, 'bob', {})).toMatchObject({ id: 2 });
    expect(await controller.updateUser(req, 2, { email: 'b@x.com' })).toMatchObject({ id: 2 });

    expect(await controller.updateUserAccess(req, 2, { isActive: true })).toMatchObject({ id: 2 });
    expect(usersService.updateUserAccess).toHaveBeenCalledWith(2, { isActive: true }, true);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'update_user_access' }));

    usersService.getRequiredUserById.mockResolvedValueOnce(me).mockResolvedValueOnce({ id: 2, username: 'bob' });
    expect(await controller.deleteUser(req, 2)).toEqual({ success: true, message: 'User deleted successfully' });
    expect(usersService.deleteUser).toHaveBeenCalledWith(2);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'delete_user', metadata: { targetUserId: 2, targetUsername: 'bob' } }));
    expect(accessControl.assertManageUsers).toHaveBeenCalledTimes(5);
  });

  it('role changes are admin-only and audited', async () => {
    expect(await controller.updateUserRole(req, 2, { role: 'ADMIN' })).toMatchObject({ role: 'ADMIN' });
    expect(accessControl.assertIsAdmin).toHaveBeenCalledWith(me);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'update_user_role', metadata: expect.objectContaining({ role: 'ADMIN' }) }));
  });

  it('changePassword delegates and audits', async () => {
    expect(await controller.changePassword(req, { currentPassword: 'a', newPassword: 'b' })).toEqual({ message: 'ok' });
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'change_password' }));
  });
});
