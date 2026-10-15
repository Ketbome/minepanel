import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

export const DATABASE_SAVE_INTERVAL_MS = 5_000;

// The parts of TypeORM's SqljsDriver used here; the class is not exported by the package.
type SqljsDriver = { save(): Promise<void>; queryRunner?: { isTransactionActive: boolean } };

// sql.js keeps the database in memory and TypeORM's autoSave exports and rewrites the
// whole file after every write, blocking the event loop. Writes are batched here into at
// most one save per interval, plus one on shutdown.
@Injectable()
export class DatabasePersistenceService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DatabasePersistenceService.name);
  private timer?: NodeJS.Timeout;
  private saving?: Promise<void>;
  // total_changes() at the last save; null forces the next one (schema sync is not counted).
  private savedChanges: number | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.flush();
    this.timer = setInterval(() => void this.flush(), DATABASE_SAVE_INTERVAL_MS);
    this.timer.unref();
  }

  async onApplicationShutdown() {
    clearInterval(this.timer);
    await this.flush();
  }

  flush(): Promise<void> {
    this.saving ??= this.save().finally(() => (this.saving = undefined));
    return this.saving;
  }

  private async save() {
    const driver = this.dataSource.driver as unknown as SqljsDriver;
    try {
      const [{ changes }] = await this.dataSource.query('SELECT total_changes() AS changes');
      // export() ends an open transaction, so never save in the middle of one.
      if (changes === this.savedChanges || driver.queryRunner?.isTransactionActive) return;
      // export() runs synchronously inside save() and reopens the database, which resets
      // total_changes() to 0; anything written after it counts from there.
      const pending = driver.save();
      this.savedChanges = 0;
      await pending;
    } catch (error) {
      this.savedChanges = null;
      this.logger.error('Could not save the database', error);
    }
  }
}
