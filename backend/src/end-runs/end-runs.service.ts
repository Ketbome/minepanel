import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndRun } from './entities/end-run.entity';
import { SPLIT_ZONES, type RunMode, type SubmitRunDto } from './dto/submit-run.dto';

const TOP = 10;

@Injectable()
export class EndRunsService {
  constructor(@InjectRepository(EndRun) private readonly repo: Repository<EndRun>) {}

  // splits are the play time at the first arrival in each zone: known zones, in order, before the end
  async submit(userId: number, { mode, timeMs, splits }: SubmitRunDto) {
    const entries = Object.entries(splits);
    const known = entries.every(([zone, at]) => (SPLIT_ZONES as readonly string[]).includes(zone) && Number.isInteger(at) && at >= 0 && at <= timeMs);
    const ordered = SPLIT_ZONES.map((zone) => splits[zone]).filter((at) => at !== undefined);
    if (!known || ordered.some((at, index) => index > 0 && at < ordered[index - 1])) throw new BadRequestException('Invalid splits');
    const { id, finishedAt } = await this.repo.save(this.repo.create({ userId, mode, timeMs, splits }));
    return { id, mode, timeMs, splits, finishedAt };
  }

  // each user's best run in the mode, fastest first, and where the caller stands
  async leaderboard(userId: number, mode: RunMode) {
    const runs = await this.repo.find({ where: { mode }, relations: { user: true }, order: { timeMs: 'ASC', finishedAt: 'ASC' } });
    const best = runs.filter((run, index) => runs.findIndex((other) => other.userId === run.userId) === index);
    const rank = best.findIndex((run) => run.userId === userId);
    return {
      top: best.slice(0, TOP).map(({ user, timeMs, finishedAt }) => ({ username: user.username, timeMs, finishedAt })),
      mine: rank < 0 ? null : { timeMs: best[rank].timeMs, rank: rank + 1 },
    };
  }
}
