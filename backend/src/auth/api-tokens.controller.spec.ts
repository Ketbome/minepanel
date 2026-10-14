import { ApiTokensController } from './api-tokens.controller';
import { AccessControlService } from 'src/users/services/access-control.service';

describe('ApiTokensController', () => {
  const req = { user: { userId: 2, username: 'bob', role: 'USER' } };
  let apiTokens: Record<string, jest.Mock>;
  let usersService: { getRequestUser: jest.Mock };
  let audit: { record: jest.Mock };
  let controller: ApiTokensController;

  beforeEach(() => {
    apiTokens = {
      listOwn: jest.fn().mockResolvedValue([]),
      listAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      create: jest.fn().mockResolvedValue({ id: 4, name: 'ci', prefix: 'mp_abcde', admin: false, readOnly: true, expiresAt: null, token: 'mp_secret' }),
      revoke: jest.fn().mockResolvedValue({ id: 4, name: 'ci', prefix: 'mp_abcde', userId: 3 }),
    };
    usersService = { getRequestUser: jest.fn().mockResolvedValue({ id: 2, username: 'bob', role: 'USER' }) };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    controller = new ApiTokensController(apiTokens as any, usersService as any, new AccessControlService(), audit as any);
  });

  it('lists the caller tokens', async () => {
    await controller.list(req);
    expect(apiTokens.listOwn).toHaveBeenCalledWith(2);
  });

  it('lists every token for admins only', async () => {
    await expect(controller.listAll(req)).rejects.toThrow('Only admins');
    usersService.getRequestUser.mockResolvedValue({ id: 1, role: 'ADMIN' });
    expect(await controller.listAll(req)).toEqual([{ id: 1 }]);
  });

  it('creates and audits without logging the secret', async () => {
    const dto = { name: 'ci', permissions: {}, serverAccess: [] };
    expect(await controller.create(req, dto)).toMatchObject({ token: 'mp_secret' });
    expect(apiTokens.create).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), dto);
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toMatchObject({ category: 'account', action: 'create_api_token', actorUserId: 2 });
    expect(JSON.stringify(entry)).not.toContain('mp_secret');
  });

  it('revokes and audits the owner', async () => {
    await controller.revoke(req, 4);
    expect(apiTokens.revoke).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), 4);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'revoke_api_token', metadata: { tokenId: 4, prefix: 'mp_abcde', ownerUserId: 3 } }));
  });
});
