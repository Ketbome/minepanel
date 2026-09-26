import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('activity_log_cursors')
export class LogCursor {
  @PrimaryColumn({ type: 'text', name: 'server_id' })
  serverId: string;

  // Hash of the first bytes of latest.log: a different head means the server rotated it
  @Column({ type: 'text', name: 'head_hash' })
  headHash: string;

  @Column({ type: 'integer' })
  offset: number;

  @Column({ type: 'boolean', name: 'history_imported', default: false })
  historyImported: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
