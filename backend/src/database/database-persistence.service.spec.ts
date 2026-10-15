import { DATABASE_SAVE_INTERVAL_MS, DatabasePersistenceService } from './database-persistence.service';

describe('DatabasePersistenceService', () => {
  let changes: number;
  let driver: { save: jest.Mock; databaseConnection: { exec: jest.Mock }; queryRunner?: { isTransactionActive: boolean } };
  let dataSource: { driver: typeof driver; query: jest.Mock };
  let service: DatabasePersistenceService;

  beforeEach(() => {
    jest.useFakeTimers();
    changes = 0;
    // Like sql.js, an export reopens the database and resets total_changes().
    driver = {
      save: jest.fn(async () => undefined).mockImplementation(() => {
        changes = 0;
        return Promise.resolve();
      }),
      databaseConnection: { exec: jest.fn() },
      queryRunner: { isTransactionActive: false },
    };
    dataSource = { driver, query: jest.fn(async () => [{ changes }]) };
    service = new DatabasePersistenceService(dataSource as any);
  });

  afterEach(() => jest.useRealTimers());

  it('saves once on boot, then only when something was written', async () => {
    await service.onApplicationBootstrap();
    expect(driver.save).toHaveBeenCalledTimes(1);

    await service.flush();
    expect(driver.save).toHaveBeenCalledTimes(1);

    changes = 3;
    await jest.advanceTimersByTimeAsync(DATABASE_SAVE_INTERVAL_MS);
    expect(driver.save).toHaveBeenCalledTimes(2);

    await service.beforeApplicationShutdown();
    expect(driver.save).toHaveBeenCalledTimes(2);
  });

  it('turns foreign keys back on after every export', async () => {
    await service.flush();
    expect(driver.databaseConnection.exec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    expect(driver.databaseConnection.exec.mock.invocationCallOrder[0]).toBeGreaterThan(driver.save.mock.invocationCallOrder[0]);
  });

  it('flushes pending writes on shutdown and stops the timer', async () => {
    await service.onApplicationBootstrap();
    changes = 1;
    await service.beforeApplicationShutdown();
    expect(driver.save).toHaveBeenCalledTimes(2);

    changes = 1;
    await jest.advanceTimersByTimeAsync(DATABASE_SAVE_INTERVAL_MS * 2);
    expect(driver.save).toHaveBeenCalledTimes(2);
  });

  it('waits for an open transaction to finish', async () => {
    driver.queryRunner!.isTransactionActive = true;
    await service.flush();
    expect(driver.save).not.toHaveBeenCalled();

    driver.queryRunner!.isTransactionActive = false;
    await service.flush();
    expect(driver.save).toHaveBeenCalledTimes(1);
  });

  it('shares a save in progress and retries after a failure', async () => {
    await Promise.all([service.flush(), service.flush()]);
    expect(driver.save).toHaveBeenCalledTimes(1);

    driver.save.mockRejectedValueOnce(new Error('disk full'));
    changes = 2;
    await service.flush();
    expect(driver.save).toHaveBeenCalledTimes(2);

    changes = 0;
    await service.flush();
    expect(driver.save).toHaveBeenCalledTimes(3);
  });
});
