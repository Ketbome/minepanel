import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type StatsSnapshot = Record<string, Record<string, number>>;

@Entity('player_sessions')
@Index(['serverId', 'playerKey', 'joinedAt'])
export class PlayerSession {
  @PrimaryGeneratedColumn() id: number;
  @Column('text') serverId: string;
  @Column('text') playerKey: string;
  @Column('text') name: string;
  @Column('datetime') joinedAt: Date;
  @Column('datetime') lastSeenAt: Date;
  @Column({ type: 'datetime', nullable: true }) leftAt: Date | null;
  @Column({ type: 'text', nullable: true }) endReason: 'left' | 'interrupted' | null;

  // Filled only on Java servers with the activity log on; null means unknown, never zero.
  @Column({ type: 'text', nullable: true }) uuid: string | null;
  @Column({ type: 'integer', nullable: true }) deaths: number | null;
  @Column({ type: 'integer', nullable: true }) mobKills: number | null;
  @Column({ type: 'integer', nullable: true }) playerKills: number | null;
  @Column({ type: 'integer', nullable: true }) blocksMined: number | null;
  @Column({ type: 'integer', nullable: true }) distanceCm: number | null;
  // Per-session `minecraft:mined` delta for stone-like blocks and valuable ores (x-ray report, spec 008)
  @Column({ type: 'simple-json', nullable: true }) oreDeltas: Record<string, number> | null;
  // Stats at join, kept only while the session is open so a panel restart can still compute deltas
  @Column({ type: 'simple-json', nullable: true }) baseline: StatsSnapshot | null;
}

@Entity('player_tracking')
export class PlayerTracking {
  @Column({ type: 'text', primary: true }) serverId: string;
  @Column('datetime') cursor: Date;
  @Column('text') runId: string;
  @Column('text') status: 'collecting' | 'offline' | 'unavailable';
}
