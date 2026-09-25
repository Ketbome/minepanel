import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ActivityType } from '../log-line.parser';

@Entity('activity_events')
@Index(['serverId', 'createdAt'])
@Index(['serverId', 'name'])
export class ActivityEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'text' })
  type: ActivityType;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  uuid: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
