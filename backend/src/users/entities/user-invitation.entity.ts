import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserPermissions, UserRole } from '../access-control.types';

@Entity('user_invitations')
export class UserInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  tokenHash: string;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  role: UserRole;

  @Column({ type: 'simple-json', nullable: true })
  permissions: UserPermissions | null;

  @Column({ type: 'simple-json', nullable: true })
  serverAccess: string[] | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
