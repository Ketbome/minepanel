import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstanceSettingsService } from './instance-settings.service';
import { InstanceSettings } from './entities/instance-settings.entity';
import { Settings } from '../users/entities/settings.entity';
import { decryptSecret, encryptSecret, isEncrypted } from '../common/crypto/secret-cipher';

describe('InstanceSettingsService', () => {
  const originalSecret = process.env.JWT_SECRET;
  let service: InstanceSettingsService;
  let repo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let userSettingsRepo: { find: jest.Mock };
  let row: any;
  let env: Record<string, any>;

  beforeAll(() => {
    process.env.JWT_SECRET = 'instance-settings-test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(async () => {
    row = { id: 1 };
    env = {};

    userSettingsRepo = { find: jest.fn().mockResolvedValue([]) };

    repo = {
      findOne: jest.fn(async () => row),
      save: jest.fn(async (value) => value),
      create: jest.fn((value) => value),
    };

    const configService = {
      get: jest.fn((key: string) => env[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstanceSettingsService,
        { provide: getRepositoryToken(InstanceSettings), useValue: repo },
        { provide: getRepositoryToken(Settings), useValue: userSettingsRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(InstanceSettingsService);
  });

  it('resolves SMTP from env when DB is empty', async () => {
    env.smtp = { host: 'smtp.env', port: 587, secure: false, user: 'u', pass: 'p', from: 'a@b.c' };
    const smtp = await service.getSmtp();
    expect(smtp.host).toBe('smtp.env');
    expect(smtp.enabled).toBe(true);
  });

  it('DB values win over env', async () => {
    env.smtp = { host: 'smtp.env', port: 587, user: 'u', pass: 'p', from: 'a@b.c' };
    row.smtpHost = 'smtp.db';
    const smtp = await service.getSmtp();
    expect(smtp.host).toBe('smtp.db');
  });

  it('decrypts the stored SMTP password', async () => {
    await service.updateIntegrations({ smtp: { password: 'secret-pass' } });
    expect(isEncrypted(row.smtpPassEnc)).toBe(true);
    const smtp = await service.getSmtp();
    expect(smtp.pass).toBe('secret-pass');
  });

  it('getPublic never leaks secrets and reports hasPassword', async () => {
    row.smtpPassEnc = encryptSecret('the-pass');
    row.oidcClientSecretEnc = encryptSecret('the-secret');
    const pub = await service.getPublic();
    expect(pub.smtp).not.toHaveProperty('pass');
    expect((pub.smtp as any).password).toBeUndefined();
    expect(pub.smtp.hasPassword).toBe(true);
    expect(pub.oidc.hasClientSecret).toBe(true);
    expect((pub.oidc as any).clientSecret).toBeUndefined();
  });

  it('write-only: omitted keeps, empty clears, value sets', async () => {
    const existing = encryptSecret('existing');
    row.smtpPassEnc = existing;

    await service.updateIntegrations({ smtp: { host: 'x' } });
    expect(row.smtpPassEnc).toBe(existing); // omitted -> kept

    await service.updateIntegrations({ smtp: { password: '' } });
    expect(row.smtpPassEnc).toBeNull(); // '' -> cleared

    await service.updateIntegrations({ smtp: { password: 'new' } });
    expect(decryptSecret(row.smtpPassEnc)).toBe('new'); // value -> set
  });

  it('notifies registered reset handlers on update', async () => {
    const handler = jest.fn();
    service.registerResetHandler(handler);
    await service.updateIntegrations({ smtp: { host: 'x' } });
    expect(handler).toHaveBeenCalled();
  });

  it('reports source per integration', async () => {
    env.smtp = { host: 'smtp.env' };
    let pub = await service.getPublic();
    expect(pub.smtp.source).toBe('env');

    row.smtpHost = 'smtp.db';
    pub = await service.getPublic();
    expect(pub.smtp.source).toBe('db');
  });

  describe('proxy and network settings', () => {
    it('clears the base domain and disables the proxy when the domain is blank', async () => {
      row.proxyEnabled = true;
      row.proxyBaseDomain = 'mc.example.com';

      const result = await service.setProxy({ enabled: true, baseDomain: null });

      expect(result).toEqual({ enabled: false, baseDomain: null });
    });

    it('reports the proxy as disabled when there is no base domain to route by', async () => {
      row.proxyEnabled = true;
      row.proxyBaseDomain = null;

      expect(await service.getProxy()).toEqual({ enabled: false, baseDomain: null });
    });

    it('keeps the base domain when only the toggle is sent', async () => {
      row.proxyBaseDomain = 'mc.example.com';
      row.proxyEnabled = false;

      expect(await service.setProxy({ enabled: true })).toEqual({ enabled: true, baseDomain: 'mc.example.com' });
    });

    it('clears network values when they are blank', async () => {
      row.publicIp = '1.1.1.1';
      row.lanIp = '192.168.1.2';

      expect(await service.setNetwork({ publicIp: '  ', lanIp: '' })).toEqual({ publicIp: null, lanIp: null });
    });
  });

  describe('migrating away from user preferences', () => {
    it('lifts proxy and network values out of the oldest user preferences once', async () => {
      userSettingsRepo.find.mockResolvedValue([
        { preferences: { proxyEnabled: true, proxyBaseDomain: 'mc.example.com', publicIp: '1.1.1.1', lanIp: '10.0.0.2' } },
      ]);

      await service.onModuleInit();

      expect(row.proxyBaseDomain).toBe('mc.example.com');
      expect(row.publicIp).toBe('1.1.1.1');
      expect(row.preferencesMigrated).toBe(true);
    });

    it('does not run again, so clearing a value is not undone on the next boot', async () => {
      row.preferencesMigrated = true;
      row.proxyBaseDomain = null;
      userSettingsRepo.find.mockResolvedValue([{ preferences: { proxyBaseDomain: 'mc.example.com' } }]);

      await service.onModuleInit();

      expect(row.proxyBaseDomain).toBeNull();
    });
  });
});
