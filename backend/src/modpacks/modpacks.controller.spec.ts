import { ModpacksController } from './modpacks.controller';

describe('ModpacksController', () => {
  const req = { user: { userId: 1 } };
  let service: Record<string, jest.Mock>;
  let accessControl: { assertServerFiles: jest.Mock };
  let controller: ModpacksController;

  beforeEach(() => {
    service = { list: jest.fn().mockResolvedValue(['m']), save: jest.fn().mockResolvedValue({ name: 'a.zip' }), remove: jest.fn().mockResolvedValue(undefined) };
    accessControl = { assertServerFiles: jest.fn() };
    controller = new ModpacksController(service as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, accessControl as any);
  });

  it('uses read access for listing and write access for changes', async () => {
    expect(await controller.list(req, 'srv')).toEqual(['m']);
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', false);
    const file = { originalname: 'a.zip' } as Express.Multer.File;
    expect(await controller.upload(req, 'srv', file)).toEqual({ name: 'a.zip' });
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', true);
    expect(await controller.remove(req, 'srv', 'a.zip')).toEqual({ success: true });
    expect(service.remove).toHaveBeenCalledWith('srv', 'a.zip');
  });
});
