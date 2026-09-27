import type { LoreKey } from './lore/en';
import type { SignId } from './store/types';

// what each sign says, on its board and in its window
export const SIGN_TEXT: Record<SignId, LoreKey> = {
  incidents: 'signIncidents',
  restart: 'signRestart',
  backups: 'signBackups',
  border: 'signBorder',
  toast: 'signToast',
  cave: 'signCave',
  quiet: 'signQuiet',
  casi: 'signCasi',
  bed: 'signBed',
  diamond: 'signDiamond',
  uptime: 'signUptime',
  tomb: 'tomb',
  bfuunyBed: 'signBfuunyBed',
  bfuunyShip: 'signBfuunyShip',
  bfuunyExit: 'signBfuunyExit',
  blasterSlow: 'signBlasterSlow',
  blasterRods: 'signBlasterRods',
  bfuunyGrave: 'signBfuunyGrave',
  server48: 'signServer48',
  server48Day1: 'signServer48Day1',
  server48Blaster: 'signServer48Blaster',
  village: 'signVillage',
  templeBfuuny: 'signTempleBfuuny',
  ruinDesert: 'signRuinDesert',
  ruinTaiga: 'signRuinTaiga',
  ruinSwamp: 'signRuinSwamp',
  ruinCoast: 'signRuinCoast',
  wreckNote: 'signWreckNote',
};
