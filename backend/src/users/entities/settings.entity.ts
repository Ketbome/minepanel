import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  userId: number;

  @Column({ type: 'text', nullable: true, name: 'cf_api_key' })
  cfApiKey?: string;

  @Column({ type: 'text', nullable: true, name: 'discord_webhook' })
  discordWebhook?: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'json', nullable: true })
  preferences?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
