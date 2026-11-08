import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// A Discord webhook configured for one server (server_id set) or shared by every
// server (server_id null). The URL is a secret: it is encrypted at rest and never
// returned by the API, only used when a notification is delivered.
@Entity('discord_webhooks')
export class DiscordWebhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'text', nullable: true, name: 'server_id' })
  serverId: string | null;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', name: 'url_enc' })
  urlEnc: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get shared(): boolean {
    return this.serverId === null;
  }
}
