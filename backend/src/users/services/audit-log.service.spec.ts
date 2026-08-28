import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditRepo: Record<string, jest.Mock>;
  let settingsRepo: { find: jest.Mock };
  let builder: Record<string, jest.Mock>;

  beforeEach(() => {
    builder = { andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(['row']) };
    auditRepo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    };
    settingsRepo = { find: jest.fn().mockResolvedValue([{ preferences: { auditRetentionDays: 10 } }]) };
    service = new AuditLogService(auditRepo as any, settingsRepo as any);
  });

  it('records entries with defaults and prunes on the first call only', async () => {
    await service.record({ actorUsername: 'admin', category: 'auth', action: 'login', summary: 'ok' });
    await service.record({ actorUserId: 2, actorUsername: 'bob', category: 'x', action: 'y', summary: 'z', outcome: 'error', serverId: 's', metadata: { a: 1 } });

    expect(auditRepo.save).toHaveBeenNthCalledWith(1, { actorUserId: null, actorUsername: 'admin', category: 'auth', action: 'login', outcome: 'success', serverId: null, summary: 'ok', metadata: null });
    expect(auditRepo.save).toHaveBeenNthCalledWith(2, expect.objectContaining({ actorUserId: 2, outcome: 'error', serverId: 's', metadata: { a: 1 } }));
    expect(auditRepo.delete).toHaveBeenCalledTimes(1);
    const cutoff = auditRepo.delete.mock.calls[0][0].createdAt.value as Date;
    expect(Date.now() - cutoff.getTime()).toBeGreaterThan(9.9 * 24 * 60 * 60 * 1000);
  });

  it('never throws when persisting or pruning fails', async () => {
    auditRepo.delete.mockRejectedValueOnce(new Error('db'));
    auditRepo.save.mockRejectedValueOnce(new Error('db'));
    await expect(service.record({ actorUsername: 'a', category: 'b', action: 'c', summary: 'd' })).resolves.toBeUndefined();
  });

  it('lists with every filter applied and the default limit', async () => {
    const rows = await service.list({ userId: 1, action: 'login', outcome: 'success', serverId: 's', dateFrom: '2026-01-01', dateTo: '2026-02-01' } as any);
    expect(rows).toEqual(['row']);
    expect(builder.andWhere).toHaveBeenCalledTimes(6);
    expect(builder.take).toHaveBeenCalledWith(200);

    await service.list({ limit: 5 } as any);
    expect(builder.andWhere).toHaveBeenCalledTimes(6);
    expect(builder.take).toHaveBeenLastCalledWith(5);
  });

  it('falls back to the default retention', async () => {
    settingsRepo.find.mockResolvedValue([]);
    await service.pruneExpired();
    const cutoff = auditRepo.delete.mock.calls[0][0].createdAt.value as Date;
    expect(Math.round((Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000))).toBe(15);
  });
});
