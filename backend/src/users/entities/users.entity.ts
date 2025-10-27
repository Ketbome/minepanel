import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'username', unique: true })
  username: string;

  @Exclude()
  @Column({ type: 'text', name: 'password' })
  password: string;

  @Column({ type: 'varchar', length: 10, default: 'user' })
  role: 'ADMIN' | 'USER';

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Exclude()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
