import { DataSource } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import { AchievementsService } from './achievements.service';
import { UserAchievement } from './entities/user-achievement.entity';

describe('AchievementsService', () => {
  let db: DataSource;
  let service: AchievementsService;

  beforeEach(async () => {
    db = await new DataSource({ type: 'sqljs', entities: [UserAchievement, Users], synchronize: true }).initialize();
    await db.getRepository(Users).save([{ username: 'ana' }, { username: 'bob' }, { username: 'cid' }]);
    service = new AchievementsService(db.getRepository(UserAchievement));
  });

  afterEach(() => db.destroy());

  it('keeps the first unlock date when a key is earned again', async () => {
    const first = await service.unlock(1, 'advStrike');
    const again = await service.unlock(1, 'advStrike');

    expect(again.unlockedAt).toEqual(first.unlockedAt);
    expect(await service.list(1)).toEqual([{ key: 'advStrike', unlockedAt: first.unlockedAt }]);
  });

  it('drops the achievements of a deleted user', async () => {
    await service.unlock(1, 'advStrike');
    await db.getRepository(Users).delete(1);

    expect(await service.list(1)).toEqual([]);
  });

  it('lists only the requesting user', async () => {
    await service.unlock(1, 'advStrike');
    await service.unlock(2, 'advSky');

    expect((await service.list(2)).map((row) => row.key)).toEqual(['advSky']);
    expect(await service.list(3)).toEqual([]);
  });
});
