import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import { EndRunsService } from './end-runs.service';
import { EndRun } from './entities/end-run.entity';

describe('EndRunsService', () => {
  let db: DataSource;
  let service: EndRunsService;

  beforeEach(async () => {
    db = await new DataSource({ type: 'sqljs', entities: [EndRun, Users], synchronize: true }).initialize();
    await db.getRepository(Users).save([{ username: 'ana' }, { username: 'bob' }, { username: 'cid' }]);
    service = new EndRunsService(db.getRepository(EndRun));
  });

  afterEach(() => db.destroy());

  it('stores a run with its splits', async () => {
    const run = await service.submit(1, { mode: 'speedrun', timeMs: 600_000, splits: { nether: 100_000, stronghold: 300_000, end: 400_000 } });

    expect(run).toMatchObject({ mode: 'speedrun', timeMs: 600_000, splits: { nether: 100_000, stronghold: 300_000, end: 400_000 } });
  });

  it('rejects splits for unknown zones, out of order or past the finish', async () => {
    await expect(service.submit(1, { mode: 'speedrun', timeMs: 600_000, splits: { moon: 1 } })).rejects.toThrow(BadRequestException);
    await expect(service.submit(1, { mode: 'speedrun', timeMs: 600_000, splits: { nether: 300_000, stronghold: 100_000 } })).rejects.toThrow(BadRequestException);
    await expect(service.submit(1, { mode: 'speedrun', timeMs: 600_000, splits: { end: 700_000 } })).rejects.toThrow(BadRequestException);
    await expect(service.submit(1, { mode: 'speedrun', timeMs: 600_000, splits: { end: 1.5 } })).rejects.toThrow(BadRequestException);
  });

  it('ranks each user by their best run in the mode and tells the caller where they stand', async () => {
    await service.submit(1, { mode: 'speedrun', timeMs: 900_000, splits: {} });
    await service.submit(1, { mode: 'speedrun', timeMs: 700_000, splits: {} });
    await service.submit(2, { mode: 'speedrun', timeMs: 650_000, splits: {} });
    await service.submit(3, { mode: 'hardcore', timeMs: 500_000, splits: {} });

    const board = await service.leaderboard(1, 'speedrun');

    expect(board.top.map(({ username, timeMs }) => [username, timeMs])).toEqual([
      ['bob', 650_000],
      ['ana', 700_000],
    ]);
    expect(board.mine).toEqual({ timeMs: 700_000, rank: 2 });
    expect((await service.leaderboard(3, 'speedrun')).mine).toBeNull();
  });

  it('keeps the top ten', async () => {
    await db.getRepository(Users).save(Array.from({ length: 12 }, (_, index) => ({ username: `p${index}` })));
    for (let user = 4; user <= 15; user += 1) await service.submit(user, { mode: 'speedrun', timeMs: 60_000 * user, splits: {} });

    expect((await service.leaderboard(15, 'speedrun')).top).toHaveLength(10);
    expect((await service.leaderboard(15, 'speedrun')).mine).toEqual({ timeMs: 900_000, rank: 12 });
  });
});
