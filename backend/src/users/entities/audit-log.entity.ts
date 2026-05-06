import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'actor_user_id', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'text', name: 'actor_username' })
  actorUsername: string;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 16, default: 'success' })
  outcome: 'success' | 'error';

  @Column({ type: 'text', name: 'server_id', nullable: true })
  serverId: string | null;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
