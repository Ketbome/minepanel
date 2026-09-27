import type { LoreKey } from './lore/en';
import type { AdvancementIcon } from './store/types';

// every advancement the journey grants, in story order, for the trophy in the panel header;
// the backend accepts only these keys (backend/src/achievements/dto/unlock-achievement.dto.ts)
export const ACHIEVEMENTS: readonly { key: LoreKey; icon: AdvancementIcon }[] = [
  { key: 'advStrike', icon: 'sword' },
  { key: 'advButton', icon: 'button' },
  { key: 'advDeeper', icon: 'pearl' },
  { key: 'advRods', icon: 'rod' },
  { key: 'advReturn', icon: 'fireball' },
  { key: 'advEyeSpy', icon: 'eye' },
  { key: 'advEnterEnd', icon: 'pearl' },
  { key: 'advFreeEnd', icon: 'dragon' },
  { key: 'advNextGen', icon: 'egg' },
  { key: 'advGetaway', icon: 'pearl' },
  { key: 'advSky', icon: 'elytra' },
  // secret: nothing in the run points at these
  { key: 'advTreasure', icon: 'dirt' },
  { key: 'advPacifist', icon: 'pearl' },
  { key: 'advKevin', icon: 'creeper' },
  { key: 'advNotAJoke', icon: 'button' },
  { key: 'advRake', icon: 'totem' },
  { key: 'advNoElytra', icon: 'barrier' },
];
