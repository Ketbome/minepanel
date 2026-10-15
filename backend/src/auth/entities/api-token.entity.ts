import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from 'src/users/entities/users.entity';
import { ApiTokenPermissions } from '../models/token.model';

@Entity('api_tokens')
export class ApiToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ type: 'text' })
  prefix: string;

  @Column({ type: 'boolean', default: false })
  admin: boolean;

  @Column({ type: 'boolean', name: 'read_only', default: false })
  readOnly: boolean;

  @Column({ type: 'simple-json' })
  permissions: ApiTokenPermissions;

  @Column({ type: 'simple-json', name: 'server_access' })
  serverAccess: string[];

  @Column({ type: 'datetime', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'datetime', name: 'last_used_at', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
