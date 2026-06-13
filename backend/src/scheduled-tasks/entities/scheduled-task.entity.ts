import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ScheduledTaskType = 'restart' | 'command';

@Entity('scheduled_tasks')
export class ScheduledTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  type: ScheduledTaskType;

  @Column({ type: 'text', nullable: true })
  command: string | null;

  @Column({ type: 'integer', name: 'interval_minutes' })
  intervalMinutes: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'datetime', name: 'last_run_at', nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'datetime', name: 'next_run_at' })
  nextRunAt: Date;

  @Column({ type: 'text', name: 'last_result', nullable: true })
  lastResult: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
