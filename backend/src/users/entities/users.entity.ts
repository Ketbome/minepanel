import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'username' })
  username: string;

  @Column({ type: 'text', name: 'password' })
  password: string;

  @Column({ type: 'varchar', length: 10, default: 'user' })
  role: 'ADMIN' | 'USER';

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
