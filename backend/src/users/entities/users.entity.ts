import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserPermissions, UserRole } from '../access-control.types';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'username', unique: true })
  username: string;

  @Column({ type: 'text', name: 'email', unique: true, nullable: true })
  email: string | null;

  @Exclude()
  @Column({ type: 'text', name: 'password', nullable: true })
  password: string | null;

  @Exclude()
  @Column({ type: 'text', name: 'oidc_subject', unique: true, nullable: true })
  oidcSubject: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'simple-json', nullable: true })
  permissions: UserPermissions | null;

  @Column({ type: 'simple-json', nullable: true })
  serverAccess: string[] | null;

  @Exclude()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
