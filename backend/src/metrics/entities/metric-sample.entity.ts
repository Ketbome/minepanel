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

  @Column({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
