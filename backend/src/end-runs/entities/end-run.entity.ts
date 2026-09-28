import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';

// a finished timed run of the End journey (the Danger Zone easter egg)
@Entity('end_runs')
@Index(['mode', 'timeMs'])
export class EndRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'text' })
  mode: string;

  @Column({ type: 'integer', name: 'time_ms' })
  timeMs: number;

  @Column({ type: 'simple-json' })
  splits: Record<string, number>;

  @CreateDateColumn({ name: 'finished_at' })
  finishedAt: Date;
}
