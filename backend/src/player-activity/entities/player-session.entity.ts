import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('player_sessions')
@Index(['serverId', 'playerKey', 'joinedAt'])
export class PlayerSession {
  @PrimaryGeneratedColumn() id: number;
  @Column('text') serverId: string;
  @Column('text') playerKey: string;
  @Column('text') name: string;
  @Column('datetime') joinedAt: Date;
  @Column('datetime') lastSeenAt: Date;
  @Column({ type: 'datetime', nullable: true }) leftAt: Date | null;
  @Column({ type: 'text', nullable: true }) endReason: 'left' | 'interrupted' | null;
}

@Entity('player_tracking')
export class PlayerTracking {
  @Column({ type: 'text', primary: true }) serverId: string;
  @Column('datetime') cursor: Date;
  @Column('text') runId: string;
  @Column('text') status: 'collecting' | 'offline' | 'unavailable';
}
