import { ForbiddenException } from '@nestjs/common';
import { PlayersController } from './players.controller';

describe('PlayersController', () => {
  const req = { user: { userId: 1 } };
  let players: { list: jest.Mock; profile: jest.Mock; searchItems: jest.Mock };
  let access: { assertServerAccess: jest.Mock };
  let controller: PlayersController;

  beforeEach(() => {
    players = { list: jest.fn().mockResolvedValue(['p']), profile: jest.fn().mockResolvedValue({ uuid: 'u' }), searchItems: jest.fn().mockResolvedValue([]) };
    access = { assertServerAccess: jest.fn() };
    controller = new PlayersController(players as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, access as any);
  });

  it('lists players after checking server access', async () => {
    expect(await controller.list(req, 'srv')).toEqual(['p']);
    expect(access.assertServerAccess).toHaveBeenCalledWith({ id: 1 }, 'srv');
  });

  it('returns a profile', async () => {
    expect(await controller.profile(req, 'srv', 'u')).toEqual({ uuid: 'u' });
    expect(players.profile).toHaveBeenCalledWith('srv', 'u');
  });

  it('searches items', async () => {
    await controller.searchItems(req, 'srv', 'diamond');
    await controller.searchItems(req, 'srv');
    expect(players.searchItems).toHaveBeenNthCalledWith(1, 'srv', 'diamond');
    expect(players.searchItems).toHaveBeenNthCalledWith(2, 'srv', '');
  });

  it('does not read files without access', async () => {
    access.assertServerAccess.mockImplementation(() => {
      throw new ForbiddenException();
    });

    await expect(controller.list(req, 'srv')).rejects.toBeInstanceOf(ForbiddenException);
    expect(players.list).not.toHaveBeenCalled();
  });
});
