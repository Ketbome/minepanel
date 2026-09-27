import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AchievementsController } from './achievements.controller';
import { UnlockAchievementDto } from './dto/unlock-achievement.dto';

describe('AchievementsController', () => {
  it('reads and unlocks for the logged-in user', async () => {
    const service = { list: jest.fn().mockResolvedValue([]), unlock: jest.fn().mockResolvedValue({ key: 'advSky' }) };
    const controller = new AchievementsController(service as any);
    const req = { user: { userId: 7 } };

    expect(await controller.list(req)).toEqual([]);
    expect(await controller.unlock(req, { key: 'advSky' })).toEqual({ key: 'advSky' });
    expect(service.list).toHaveBeenCalledWith(7);
    expect(service.unlock).toHaveBeenCalledWith(7, 'advSky');
  });

  it('rejects keys the journey does not grant', async () => {
    expect(await validate(plainToInstance(UnlockAchievementDto, { key: 'advSky' }))).toHaveLength(0);
    expect(await validate(plainToInstance(UnlockAchievementDto, { key: 'advCheat' }))).not.toHaveLength(0);
  });
});
