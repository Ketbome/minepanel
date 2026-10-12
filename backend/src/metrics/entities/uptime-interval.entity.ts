import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// One row per stretch of observed up or unplanned-down time. Planned/clean auto-stops and
// unknown periods (panel off) are gaps. Intervals expire 30 days after they end, with hourly pruning.
@Entity('uptime_intervals')
@Index(['serverId', 'endedAt'])
@Index(['endedAt'])
export class UptimeInterval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'boolean' })
  running: boolean;

  @Column({ type: 'datetime', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'datetime', name: 'ended_at' })
  endedAt: Date;
}
