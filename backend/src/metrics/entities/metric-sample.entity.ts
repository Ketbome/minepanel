import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('metric_samples')
@Index(['serverId', 'createdAt'])
export class MetricSample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'float', name: 'cpu_percent' })
  cpuPercent: number;

  @Column({ type: 'float', name: 'memory_mb' })
  memoryMb: number;

  @Column({ type: 'float', name: 'memory_limit_mb', nullable: true })
  memoryLimitMb: number | null;

  @Column({ type: 'float', nullable: true })
  tps: number | null;

  @Column({ type: 'text', name: 'tick_source', nullable: true })
  tickSource: 'neoforge' | 'spark' | null;

  @Column({ type: 'float', name: 'mspt_mean', nullable: true })
  msptMean: number | null;

  @Column({ type: 'float', name: 'mspt_median', nullable: true })
  msptMedian: number | null;

  @Column({ type: 'float', name: 'mspt_p95', nullable: true })
  msptP95: number | null;

  @Column({ type: 'integer', name: 'players_online', nullable: true })
  playersOnline: number | null;

  @Column({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
