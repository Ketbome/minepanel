import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAchievement } from './entities/user-achievement.entity';
import type { AchievementKey } from './dto/unlock-achievement.dto';

const toView = ({ key, unlockedAt }: UserAchievement) => ({ key, unlockedAt });

@Injectable()
export class AchievementsService {
  constructor(@InjectRepository(UserAchievement) private readonly repo: Repository<UserAchievement>) {}

  async list(userId: number) {
    const rows = await this.repo.find({ where: { userId }, order: { unlockedAt: 'ASC' } });
    return rows.map(toView);
  }

  // replaying the journey earns the same keys again; the first date is the one that counts
  async unlock(userId: number, key: AchievementKey) {
    const existing = await this.repo.findOne({ where: { userId, key } });
    if (existing) return toView(existing);
    return toView(await this.repo.save(this.repo.create({ userId, key })));
  }
}
