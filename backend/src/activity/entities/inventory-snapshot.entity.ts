import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { PlayerInventory } from 'src/players/players.service';

export type SnapshotReason = 'join' | 'leave' | 'autosave';

@Entity('inventory_snapshots')
@Index(['serverId', 'uuid', 'createdAt'])
export class InventorySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'server_id' })
  serverId: string;

  @Column({ type: 'text' })
  uuid: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  reason: SnapshotReason;

  // Content hash: an autosave that changed nothing does not add a snapshot
  @Column({ type: 'text' })
  hash: string;

  @Column({ type: 'simple-json' })
  data: PlayerInventory;

  // When Minecraft wrote the player file, not when the panel read it
  @Column({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
