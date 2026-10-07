import { DataSource } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import { LogPreset } from './entities/log-preset.entity';
import { LogPresetsService } from './log-presets.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LogPresetsController } from './log-presets.controller';
import { LogPresetRemoveQueryDto, LogPresetServerQueryDto } from './dto/save-log-preset.dto';

const dto = (name: string, serverId = 'srv') => ({ serverId, name, searchTerm: 'x', levelFilter: 'error', regex: false, lines: 500, sinceMinutes: 0 });

describe('log presets', () => {
  let db: DataSource;
  let service: LogPresetsService;

  beforeEach(async () => {
    db = await new DataSource({ type: 'sqljs', entities: [LogPreset, Users], synchronize: true }).initialize();
    await db.getRepository(Users).save([{ username: 'ana' }, { username: 'bob' }]);
    service = new LogPresetsService(db.getRepository(LogPreset));
  });

  afterEach(() => db.destroy());

  it('overwrites a preset with the same name and scopes by user and server', async () => {
    await service.save(1, dto('errors'));
    await service.save(1, { ...dto('errors'), searchTerm: 'y' });
    await service.save(1, dto('other', 'srv2'));
    await service.save(2, dto('errors'));

    expect(await service.list(1, 'srv')).toEqual([{ name: 'errors', searchTerm: 'y', levelFilter: 'error', regex: false, lines: 500, sinceMinutes: 0 }]);
    expect(await service.list(2, 'srv')).toHaveLength(1);
  });

  it('removes a preset and caps presets per server', async () => {
    await service.save(1, dto('a'));
    await service.remove(1, 'srv', 'a');
    expect(await service.list(1, 'srv')).toEqual([]);

    for (let i = 0; i < 20; i++) await service.save(1, dto(`p${i}`));
    await expect(service.save(1, dto('one-too-many'))).rejects.toThrow('At most 20');
    await expect(service.save(1, dto('p3'))).resolves.toBeDefined();
  });

  it('keeps the limit when saves arrive at the same time', async () => {
    for (let i = 0; i < 19; i++) await service.save(1, dto(`p${i}`));
    const results = await Promise.allSettled([service.save(1, dto('x')), service.save(1, dto('y'))]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(await service.list(1, 'srv')).toHaveLength(20);
  });

  it('checks server access before touching presets', async () => {
    const svc = { list: jest.fn().mockResolvedValue([]), save: jest.fn().mockResolvedValue({}), remove: jest.fn() };
    const assertServerAccess = jest.fn();
    const controller = new LogPresetsController(svc as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 7 }) } as any, { assertServerAccess } as any);
    const req = { user: { userId: 7 } };

    await controller.list(req, { serverId: 'srv' });
    await controller.save(req, dto('a'));
    await controller.remove(req, { serverId: 'srv', name: 'a' });
    expect(assertServerAccess).toHaveBeenCalledTimes(3);
    expect(svc.remove).toHaveBeenCalledWith(7, 'srv', 'a');

    assertServerAccess.mockImplementation(() => { throw new Error('Forbidden'); });
    await expect(controller.list(req, { serverId: 'other' })).rejects.toThrow('Forbidden');
  });

  it('rejects query strings missing serverId or name, so a delete can never widen', async () => {
    expect(await validate(plainToInstance(LogPresetServerQueryDto, {}))).not.toHaveLength(0);
    expect(await validate(plainToInstance(LogPresetRemoveQueryDto, { serverId: 'srv' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(LogPresetRemoveQueryDto, { serverId: 'srv', name: 'a' }))).toHaveLength(0);
  });
});
