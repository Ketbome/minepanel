import type { StateCreator } from 'zustand';
import type { ItemId, Slot } from '../items';
import type { LoreKey } from '../lore/en';

export type Zone = 'overworld' | 'ancient' | 'nether' | 'stronghold' | 'end' | 'endcity' | 'poem';
export type Veil = 'black' | 'portal' | 'white' | 'none';
export type Stage = 'arrival' | 'crystals' | 'dragon' | 'victory' | 'exit';
export type DeathCause = 'lava' | 'void' | 'fall' | 'bed' | 'warden' | 'enderman' | 'blaze' | 'dragon' | 'breath' | 'elytra' | 'shulker' | 'silverfish' | 'ghast' | 'creeper';
export type ChestId = 'camp' | 'backups' | 'ruined';
export type BookId = 'note' | 'diary' | 'register' | 'admin2011' | 'stop';
export type SignId = 'incidents' | 'restart' | 'backups' | 'border' | 'toast' | 'cave' | 'quiet' | 'casi' | 'bed' | 'diamond' | 'uptime' | 'tomb' | 'bfuunyBed' | 'bfuunyShip' | 'bfuunyExit';
export type AdvancementKind = 'task' | 'goal';
export type AdvancementIcon = 'eye' | 'pearl' | 'dragon' | 'egg' | 'sword' | 'rod' | 'elytra' | 'button' | 'fireball';

// one-shot story beats; a flag never goes back to false within a run
export type Flag =
  | 'started'
  | 'camp'
  | 'swordCrafted'
  | 'mapBought'
  | 'registerBought'
  | 'buttonPressed'
  | 'wardenMet'
  | 'wardenHit'
  | 'portalLit'
  | 'nether'
  | 'blazeWarned'
  | 'rodsDone'
  | 'ghastReturned'
  | 'eyesCrafted'
  | 'eyeThrown'
  | 'eyeLanded'
  | 'stronghold'
  | 'diaryRead'
  | 'silverfish'
  | 'gatewayHinted'
  | 'endcity'
  | 'shulkerJoked'
  | 'elytra'
  | 'keeperMet'
  | 'stayed'
  | 'bfuunyChest'
  | 'bfuunyBed';

export type Panel =
  | { readonly kind: 'chest'; readonly id: ChestId }
  | { readonly kind: 'craft' }
  | { readonly kind: 'book'; readonly id: BookId }
  | { readonly kind: 'sign'; readonly id: SignId }
  | { readonly kind: 'trade' }
  | { readonly kind: 'inventory' }
  | { readonly kind: 'map' };

export interface Ghost {
  readonly name: string;
  readonly at: number;
}

export interface Caption {
  readonly id: number;
  readonly key: LoreKey;
  readonly at: number;
}

export interface Advancement {
  readonly id: number;
  readonly kind: AdvancementKind;
  readonly title: LoreKey;
  readonly icon: AdvancementIcon;
}

export type ChatLine =
  | Advancement
  | { readonly id: number; readonly kind: 'say'; readonly key: LoreKey; readonly author?: string }
  | { readonly id: number; readonly kind: 'system'; readonly key: LoreKey }
  | { readonly id: number; readonly kind: 'join' | 'leave'; readonly name?: string }
  | { readonly id: number; readonly kind: 'voice'; readonly key: LoreKey; readonly voice: 0 | 1 }
  | { readonly id: number; readonly kind: 'named'; readonly name: string; readonly key: LoreKey };

export interface Notice {
  readonly id: number;
  readonly key: LoreKey;
  readonly subtitle?: LoreKey;
}

export interface Transition {
  readonly zone: Zone;
  readonly entry: string;
  readonly veil: Veil;
}

export interface GameSlice {
  zone: Zone;
  entry: string;
  transition: Transition | null;
  player: string;
  ghost: Ghost;
  muted: boolean;
  paused: boolean;
  // the pointer lock could not come back on its own; a click resumes
  resume: boolean;
  flags: Partial<Record<Flag, true>>;
  killed: string[];
  mined: number[];
  // the ruined portal's gaps that already hold obsidian
  obsidian: number[];
  frames: boolean[];
  noise: number;
  checkpoint: readonly [number, number, number, number] | null;
  spawnId: number;
  deaths: number;
  stage: Stage;
  crystals: boolean[];
  dragonHp: number;
  eggHops: number;
  eggCaught: boolean;
  portalOpen: boolean;
  exitTo: 'portal' | 'gateway' | null;
  xp: number;
  reset: (player: string, muted: boolean) => void;
  setPlayer: (player: string) => void;
  travel: (zone: Zone, entry?: string, veil?: Veil) => void;
  arrive: () => void;
  setFlag: (flag: Flag) => void;
  kill: (id: string) => void;
  mine: (cell: number) => void;
  placeObsidian: (gap: number) => void;
  placeEye: (frame: number) => void;
  setNoise: (noise: number) => void;
  setCheckpoint: (x: number, y: number, z: number, yaw: number) => void;
  setPaused: (paused: boolean) => void;
  setResume: (resume: boolean) => void;
  setStage: (stage: Stage) => void;
  destroyCrystal: (index: number) => void;
  damageDragon: (amount: number) => void;
  healDragon: () => void;
  openPortal: () => void;
  exit: (to: 'portal' | 'gateway') => void;
  hopEgg: () => void;
  catchEgg: () => void;
  setXp: (xp: number) => void;
}

export type Area = 'inv' | 'chest' | 'grid';
export type Button = 'left' | 'right';

export interface InventorySlice {
  inventory: Slot[];
  selected: number;
  chests: Record<ChestId, Slot[]>;
  grid: Slot[];
  // the stack held on the mouse cursor while a window is open
  cursor: Slot;
  panel: Panel | null;
  clickSlot: (area: Area, index: number, button: Button, shift: boolean) => void;
  spread: (area: Area, indices: readonly number[], button: Button) => void;
  takeOutput: (shift: boolean) => void;
  give: (item: ItemId, count?: number) => void;
  spend: (item: ItemId, count?: number) => boolean;
  select: (slot: number) => void;
  cycle: (by: number) => void;
  takeFromChest: (id: ChestId, index: number) => void;
  takeAllFromChest: (id: ChestId) => void;
  setInventory: (inventory: Slot[]) => void;
  setCraft: (next: { grid: Slot[]; inventory: Slot[] }) => void;
  trade: (cost: number, item: ItemId) => boolean;
  openPanel: (panel: Panel) => void;
  closePanel: () => void;
  grantKit: (zone: Zone) => void;
}

export interface HealthSlice {
  hp: number;
  dead: DeathCause | null;
  hurtAt: number;
  levitateUntil: number;
  hurt: (amount: number, cause: DeathCause) => void;
  heal: (amount: number) => void;
  levitate: (seconds: number) => void;
  respawn: () => void;
}

export interface HudSlice {
  captions: Caption[];
  toasts: Advancement[];
  chat: ChatLine[];
  actionBar: Notice | null;
  title: Notice | null;
  aim: LoreKey | null;
  swing: number;
  charge: number;
  caption: (key: LoreKey) => void;
  dropCaption: (id: number) => void;
  advance: (kind: AdvancementKind, title: LoreKey, icon: AdvancementIcon) => void;
  say: (key: LoreKey, author?: string) => void;
  announce: (key: LoreKey) => void;
  presence: (kind: 'join' | 'leave', name?: string) => void;
  voices: (first: LoreKey, second: LoreKey) => void;
  obituary: (name: string, key: LoreKey) => void;
  dropToast: (id: number) => void;
  dropChat: (id: number) => void;
  showActionBar: (key: LoreKey) => void;
  showTitle: (key: LoreKey, subtitle?: LoreKey) => void;
  clearNotice: (slot: 'actionBar' | 'title', id: number) => void;
  setAim: (aim: LoreKey | null) => void;
  bump: () => void;
  setCharge: (charge: number) => void;
}

export type EndGameState = GameSlice & InventorySlice & HealthSlice & HudSlice;

export type Slice<T> = StateCreator<EndGameState, [], [], T>;
