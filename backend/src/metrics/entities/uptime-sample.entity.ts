import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// One row per observed running or unplanned-down minute. Planned/clean auto-stops and
// unknown periods have no row. Samples expire after 30 days, with hourly pruning.
@Entity('uptime_samples')
@Index(['serverId', 'createdAt'])
@Index(['createdAt'])
export class UptimeSample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'boolean' })
  running: boolean;

  @Column({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
