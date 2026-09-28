import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EndRunsController } from './end-runs.controller';
import { SubmitRunDto } from './dto/submit-run.dto';

describe('EndRunsController', () => {
  const service = { submit: jest.fn().mockResolvedValue({ id: 1 }), leaderboard: jest.fn().mockResolvedValue({ top: [], mine: null }) };
  const controller = new EndRunsController(service as any);
  const req = { user: { userId: 7 } };

  it('submits and ranks for the logged-in user', async () => {
    const dto = { mode: 'speedrun' as const, timeMs: 600_000, splits: {} };
    expect(await controller.submit(req, dto)).toEqual({ id: 1 });
    expect(service.submit).toHaveBeenCalledWith(7, dto);
    expect(await controller.leaderboard(req, 'hardcore')).toEqual({ top: [], mine: null });
    expect(service.leaderboard).toHaveBeenCalledWith(7, 'hardcore');
  });

  it('rejects an unknown leaderboard mode', () => {
    expect(() => controller.leaderboard(req, 'creative')).toThrow(BadRequestException);
  });

  it('validates the mode and a sane time', async () => {
    const check = (body: object) => validate(plainToInstance(SubmitRunDto, body));
    expect(await check({ mode: 'speedrun', timeMs: 600_000, splits: {} })).toHaveLength(0);
    expect(await check({ mode: 'creative', timeMs: 600_000, splits: {} })).not.toHaveLength(0);
    expect(await check({ mode: 'speedrun', timeMs: 10, splits: {} })).not.toHaveLength(0);
    expect(await check({ mode: 'speedrun', timeMs: 600_000.5, splits: {} })).not.toHaveLength(0);
    expect(await check({ mode: 'speedrun', timeMs: 600_000, splits: 'fast' })).not.toHaveLength(0);
  });
});
