import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ScheduledTaskType = 'restart' | 'command' | 'announce';
export type ScheduleKind = 'interval' | 'cron';

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

  // For 'command' the console command; for 'announce' the messages, one per line.
  @Column({ type: 'text', nullable: true })
  command: string | null;

  // Which 'announce' message goes out next; wraps around the list.
  @Column({ type: 'integer', name: 'announcement_index', default: 0 })
  announcementIndex: number;

  @Column({ type: 'varchar', length: 16, name: 'schedule_kind', default: 'interval' })
  scheduleKind: ScheduleKind;

  @Column({ type: 'integer', name: 'interval_minutes', nullable: true })
  intervalMinutes: number | null;

  @Column({ type: 'text', name: 'cron_expression', nullable: true })
  cronExpression: string | null;

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
