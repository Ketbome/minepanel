import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type StatsSnapshot = Record<string, Record<string, number>>;

@Entity('player_sessions')
@Index(['serverId', 'name'])
@Index(['serverId', 'endAt'])
export class PlayerSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  uuid: string | null;

  @Column({ type: 'datetime', name: 'start_at' })
  startAt: Date;

  @Column({ type: 'datetime', name: 'end_at', nullable: true })
  endAt: Date | null;

  // Stat deltas are null when unknown: imported history has no stats snapshots.
  @Column({ type: 'integer', nullable: true })
  deaths: number | null;

  @Column({ type: 'integer', name: 'mob_kills', nullable: true })
  mobKills: number | null;

  @Column({ type: 'integer', name: 'player_kills', nullable: true })
  playerKills: number | null;

  @Column({ type: 'integer', name: 'blocks_mined', nullable: true })
  blocksMined: number | null;

  @Column({ type: 'integer', name: 'distance_cm', nullable: true })
  distanceCm: number | null;

  // Per-session `minecraft:mined` delta for stone-like blocks and valuable ores (x-ray report, spec 008)
  @Column({ type: 'simple-json', name: 'ore_deltas', nullable: true })
  oreDeltas: Record<string, number> | null;

  @Column({ type: 'integer', name: 'logged_deaths', default: 0 })
  loggedDeaths: number;

  @Column({ type: 'integer', default: 0 })
  advancements: number;

  @Column({ type: 'integer', name: 'chat_count', default: 0 })
  chatCount: number;

  // Stats at join, kept only while the session is open so a panel restart can still compute deltas
  @Column({ type: 'simple-json', nullable: true })
  baseline: StatsSnapshot | null;
}
