import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import { Exclude } from 'class-transformer';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  @Exclude()
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

  @Exclude()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
