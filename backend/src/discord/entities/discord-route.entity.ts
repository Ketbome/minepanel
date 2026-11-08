import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

// Which webhook receives one kind of notification for one server. A row with a
// null webhook_id means "explicitly off"; no row at all means the default
// (Minepanel's instance-wide channel for operational alerts, nothing for activity).
@Entity('discord_routes')
@Unique(['serverId', 'eventKey'])
export class DiscordRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'text', name: 'event_key' })
  eventKey: string;

  @Column({ type: 'int', nullable: true, name: 'webhook_id' })
  webhookId: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
