import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// One row per server per sampler tick, running or not. Minutes the backend itself was down have
// no row, so they stay unknown instead of counting as downtime.
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
