import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';

@Entity('log_presets')
@Index(['userId', 'serverId', 'name'], { unique: true })
export class LogPreset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', name: 'search_term', default: '' })
  searchTerm: string;

  @Column({ type: 'text', name: 'level_filter', default: 'all' })
  levelFilter: string;

  @Column({ type: 'boolean', default: false })
  regex: boolean;

  @Column({ type: 'integer', default: 500 })
  lines: number;

  // 0 means no time limit.
  @Column({ type: 'integer', name: 'since_minutes', default: 0 })
  sinceMinutes: number;
}
