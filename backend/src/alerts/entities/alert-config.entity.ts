import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('alert_configs')
export class AlertConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'boolean', name: 'down_alert_enabled', default: false })
  downAlertEnabled: boolean;

  @Column({ type: 'boolean', name: 'resource_alert_enabled', default: false })
  resourceAlertEnabled: boolean;

  @Column({ type: 'integer', name: 'cpu_threshold_percent', default: 90 })
  cpuThresholdPercent: number;

  @Column({ type: 'integer', name: 'memory_threshold_percent', default: 90 })
  memoryThresholdPercent: number;

  @Column({ type: 'integer', name: 'sustained_minutes', default: 5 })
  sustainedMinutes: number;

  @Column({ type: 'integer', name: 'cooldown_minutes', default: 30 })
  cooldownMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
