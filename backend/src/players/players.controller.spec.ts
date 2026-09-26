import { ForbiddenException, StreamableFile } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ItemTexturesController, PlayersController } from './players.controller';

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

describe('ItemTexturesController', () => {
  it('streams cached textures and 404s the rest', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-texture-ctl-'));
    const file = path.join(dir, 'stone.png');
    await fs.writeFile(file, 'png');
    const controller = new ItemTexturesController({ resolve: jest.fn().mockResolvedValueOnce(file).mockResolvedValueOnce(null) } as any);
    const found = { setHeader: jest.fn() };
    const stream = await controller.texture('1.21.1', 'stone', found as any);
    expect(stream).toBeInstanceOf(StreamableFile);
    expect(stream.getHeaders().type).toBe('image/png');
    expect(found.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=604800, immutable');

    // A missing texture may appear once the download finishes, so the 404 must stay uncached.
    const missing = { setHeader: jest.fn() };
    await expect(controller.texture('1.21.1', 'nope', missing as any)).rejects.toThrow();
    expect(missing.setHeader).not.toHaveBeenCalled();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
