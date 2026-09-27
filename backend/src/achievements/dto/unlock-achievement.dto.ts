import { IsIn } from 'class-validator';

// the End journey's advancements, mirrored by frontend/src/components/organisms/settings/end/achievements.ts
export const ACHIEVEMENT_KEYS = ['advStrike', 'advButton', 'advDeeper', 'advRods', 'advReturn', 'advEyeSpy', 'advEnterEnd', 'advFreeEnd', 'advNextGen', 'advGetaway', 'advSky', 'advTreasure', 'advPacifist', 'advKevin', 'advNotAJoke', 'advRake', 'advNoElytra', 'advRuins'] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

export class UnlockAchievementDto {
  @IsIn(ACHIEVEMENT_KEYS)
  key: AchievementKey;
}
