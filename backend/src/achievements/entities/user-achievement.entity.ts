import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';

@Entity('user_achievements')
@Index(['userId', 'key'], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'text' })
  key: string;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt: Date;
}
