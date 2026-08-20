import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstanceSettings } from './entities/instance-settings.entity';
import { Settings } from '../users/entities/settings.entity';
import { UpdateIntegrationSettingsDto } from './dto/update-integration-settings.dto';
import { decryptSecret, encryptSecret } from '../common/crypto/secret-cipher';

export interface ResolvedSmtp {
  host?: string;
  port?: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from?: string;
  enabled: boolean;
}

export interface ResolvedOidc {
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes: string;
  providerName: string;
  disablePasswordLogin: boolean;
  enabled: boolean;
}

@Injectable()
export class InstanceSettingsService implements OnModuleInit {
  private readonly logger = new Logger(InstanceSettingsService.name);
  private resetHandlers: Array<() => void> = [];

  constructor(
    @InjectRepository(InstanceSettings)
    private readonly repo: Repository<InstanceSettings>,
    @InjectRepository(Settings)
    private readonly userSettingsRepo: Repository<Settings>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.migrateProxyAndNetworkFromPreferences();
  }

  // Proxy, host IPs and the new-server defaults used to live in one user's
  // preferences JSON even though they drive every server's compose file. Lift
  // the first user's values into the instance row, once.
  private async migrateProxyAndNetworkFromPreferences(): Promise<void> {
    try {
      const row = await this.getRow();
      if (row.preferencesMigrated) return;

      const [oldest] = await this.userSettingsRepo.find({ order: { id: 'ASC' }, take: 1 });
      const preferences = oldest?.preferences ?? {};

      row.proxyEnabled = preferences.proxyEnabled ?? null;
      row.proxyBaseDomain = preferences.proxyBaseDomain ?? null;
      row.publicIp = preferences.publicIp ?? null;
      row.lanIp = preferences.lanIp ?? null;
      row.javaServerDefaults = preferences.javaServerDefaults ?? null;
      row.preferencesMigrated = true;
      await this.repo.save(row);

      this.logger.log('Moved proxy and network settings from user preferences to the instance settings');
    } catch (error) {
      this.logger.error('Could not migrate proxy and network settings from user preferences', error);
    }
  }

  async getProxy(): Promise<{ enabled: boolean; baseDomain: string | null }> {
    const row = await this.getRow();
    const baseDomain = row.proxyBaseDomain?.trim() || null;
    return { enabled: (row.proxyEnabled ?? false) && !!baseDomain, baseDomain };
  }

  async setProxy(update: { enabled?: boolean; baseDomain?: string | null }): Promise<{ enabled: boolean; baseDomain: string | null }> {
    const row = await this.getRow();
    if (update.baseDomain !== undefined) {
      row.proxyBaseDomain = update.baseDomain?.trim() || null;
    }
    if (update.enabled !== undefined) {
      row.proxyEnabled = update.enabled;
    }
    // Routing by hostname is meaningless without a base domain.
    if (!row.proxyBaseDomain) {
      row.proxyEnabled = false;
    }
    await this.repo.save(row);
    return this.getProxy();
  }

  async getNetwork(): Promise<{ publicIp: string | null; lanIp: string | null }> {
    const row = await this.getRow();
    return { publicIp: row.publicIp ?? null, lanIp: row.lanIp ?? null };
  }

  async setNetwork(update: { publicIp?: string | null; lanIp?: string | null }): Promise<{ publicIp: string | null; lanIp: string | null }> {
    const row = await this.getRow();
    if (update.publicIp !== undefined) row.publicIp = update.publicIp?.trim() || null;
    if (update.lanIp !== undefined) row.lanIp = update.lanIp?.trim() || null;
    await this.repo.save(row);
    return this.getNetwork();
  }

  async getRouterSettings(): Promise<{
    proxyPort: string;
    autoScaleEnabled: boolean;
    autoScaleToken: string | null;
    autoScaleDownAfter: string;
    autoScaleWakeTimeout: string;
    autoScaleAsleepMotd: string;
    autoScaleLoadingMotd: string;
    extraNetworks: string | null;
  }> {
    const row = await this.getRow();
    return {
      proxyPort: row.proxyPort?.trim() || '25565',
      autoScaleEnabled: row.autoScaleEnabled ?? false,
      autoScaleToken: row.autoScaleTokenEnc ? decryptSecret(row.autoScaleTokenEnc) : null,
      autoScaleDownAfter: row.autoScaleDownAfter?.trim() || '10m',
      autoScaleWakeTimeout: row.autoScaleWakeTimeout?.trim() || '180s',
      autoScaleAsleepMotd: row.autoScaleAsleepMotd?.trim() || 'Server is asleep. Join to wake it up!',
      autoScaleLoadingMotd: row.autoScaleLoadingMotd?.trim() || 'Server is starting...',
      extraNetworks: row.proxyExtraNetworks ?? null,
    };
  }

  async updateRouterSettings(update: {
    proxyPort?: string;
    autoScaleEnabled?: boolean;
    autoScaleDownAfter?: string;
    autoScaleWakeTimeout?: string;
    autoScaleAsleepMotd?: string;
    autoScaleLoadingMotd?: string;
    extraNetworks?: string | null;
  }): Promise<void> {
    const row = await this.getRow();

    if (update.proxyPort !== undefined) row.proxyPort = update.proxyPort.trim() || null;
    if (update.autoScaleDownAfter !== undefined) row.autoScaleDownAfter = update.autoScaleDownAfter.trim() || null;
    if (update.autoScaleWakeTimeout !== undefined) row.autoScaleWakeTimeout = update.autoScaleWakeTimeout.trim() || null;
    if (update.autoScaleAsleepMotd !== undefined) row.autoScaleAsleepMotd = update.autoScaleAsleepMotd.trim() || null;
    if (update.autoScaleLoadingMotd !== undefined) row.autoScaleLoadingMotd = update.autoScaleLoadingMotd.trim() || null;
    if (update.extraNetworks !== undefined) row.proxyExtraNetworks = update.extraNetworks?.trim() || null;

    if (update.autoScaleEnabled !== undefined) {
      row.autoScaleEnabled = update.autoScaleEnabled;
      // The router authenticates to the panel with this; mint it on first use so
      // nobody has to run openssl and copy it into two places.
      if (update.autoScaleEnabled && !row.autoScaleTokenEnc) {
        row.autoScaleTokenEnc = encryptSecret(randomBytes(32).toString('base64'));
      }
    }

    await this.repo.save(row);
  }

  async getAutoScaleToken(): Promise<string | null> {
    const row = await this.getRow();
    if (!row.autoScaleEnabled || !row.autoScaleTokenEnc) return null;
    return decryptSecret(row.autoScaleTokenEnc);
  }

  async getJavaServerDefaults(): Promise<Record<string, unknown> | null> {
    return (await this.getRow()).javaServerDefaults ?? null;
  }

  async setJavaServerDefaults(defaults: Record<string, unknown> | null): Promise<void> {
    const row = await this.getRow();
    row.javaServerDefaults = defaults;
    await this.repo.save(row);
  }

  // Consumers (mailer, OIDC) register a callback to drop their cached client
  // when integration settings change.
  registerResetHandler(handler: () => void): void {
    this.resetHandlers.push(handler);
  }

  private notifyChanged(): void {
    for (const handler of this.resetHandlers) handler();
  }

  private prefer(dbValue: string | null | undefined, envValue: string | undefined): string | undefined {
    const trimmed = typeof dbValue === 'string' ? dbValue.trim() : dbValue;
    if (trimmed) return trimmed;
    return envValue || undefined;
  }

  private async getRow(): Promise<InstanceSettings> {
    let row = await this.repo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.repo.create({ id: 1 });
      row = await this.repo.save(row);
    }
    return row;
  }

  async getSmtp(): Promise<ResolvedSmtp> {
    const row = await this.getRow();
    const env = this.configService.get<any>('smtp') ?? {};

    const host = this.prefer(row.smtpHost, env.host);
    const portDb = row.smtpPort ?? undefined;
    const port = portDb ?? (env.port ? Number(env.port) : undefined);
    const secure = row.smtpSecure ?? (env.secure ?? false);
    const user = this.prefer(row.smtpUser, env.user);
    const pass = this.prefer(row.smtpPassEnc ? decryptSecret(row.smtpPassEnc) : undefined, env.pass);
    const from = this.prefer(row.smtpFrom, env.from);

    return {
      host,
      port,
      secure: !!secure,
      user,
      pass,
      from,
      enabled: !!(host && port && user && pass && from),
    };
  }

  async getOidc(): Promise<ResolvedOidc> {
    const row = await this.getRow();
    const env = this.configService.get<any>('oidc') ?? {};

    const issuer = this.prefer(row.oidcIssuer, env.issuer);
    const clientId = this.prefer(row.oidcClientId, env.clientId);
    const clientSecret = this.prefer(row.oidcClientSecretEnc ? decryptSecret(row.oidcClientSecretEnc) : undefined, env.clientSecret);
    const redirectUri = this.prefer(row.oidcRedirectUri, env.redirectUri);
    const scopes = this.prefer(row.oidcScopes, env.scopes) || 'openid email profile';
    const providerName = this.prefer(row.oidcProviderName, env.providerName) || 'SSO';
    const disablePasswordLogin = row.oidcDisablePasswordLogin ?? (env.disablePasswordLogin ?? false);

    return {
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      scopes,
      providerName,
      disablePasswordLogin: !!disablePasswordLogin,
      enabled: !!(issuer && clientId && clientSecret && redirectUri),
    };
  }

  // Masked view for the API: never returns secrets, only whether they are set
  // and where each integration's config comes from.
  async getPublic() {
    const row = await this.getRow();
    const env = this.configService.get<any>('smtp') ?? {};
    const envOidc = this.configService.get<any>('oidc') ?? {};
    const [smtp, oidc] = await Promise.all([this.getSmtp(), this.getOidc()]);

    return {
      smtp: {
        host: smtp.host ?? '',
        port: smtp.port ?? null,
        secure: smtp.secure,
        user: smtp.user ?? '',
        from: smtp.from ?? '',
        hasPassword: !!smtp.pass,
        configured: smtp.enabled,
        source: this.sourceOf(row.smtpHost, env.host),
      },
      oidc: {
        issuer: oidc.issuer ?? '',
        clientId: oidc.clientId ?? '',
        redirectUri: oidc.redirectUri ?? '',
        scopes: oidc.scopes,
        providerName: oidc.providerName,
        disablePasswordLogin: oidc.disablePasswordLogin,
        hasClientSecret: !!oidc.clientSecret,
        configured: oidc.enabled,
        source: this.sourceOf(row.oidcIssuer, envOidc.issuer),
      },
    };
  }

  private sourceOf(dbValue: string | null | undefined, envValue: string | undefined): 'db' | 'env' | 'unset' {
    if (typeof dbValue === 'string' && dbValue.trim()) return 'db';
    if (envValue) return 'env';
    return 'unset';
  }

  // Write-only secret handling: undefined keeps, '' clears, other value sets.
  private applySecret(current: string | null | undefined, incoming: string | undefined): string | null | undefined {
    if (incoming === undefined) return current;
    if (incoming === '') return null;
    return encryptSecret(incoming);
  }

  private applyText(current: string | null | undefined, incoming: string | undefined): string | null | undefined {
    if (incoming === undefined) return current;
    const trimmed = incoming.trim();
    return trimmed ? trimmed : null;
  }

  async updateIntegrations(dto: UpdateIntegrationSettingsDto) {
    const row = await this.getRow();

    if (dto.smtp) {
      const s = dto.smtp;
      row.smtpHost = this.applyText(row.smtpHost, s.host);
      if (s.port !== undefined) row.smtpPort = s.port;
      if (s.secure !== undefined) row.smtpSecure = s.secure;
      row.smtpUser = this.applyText(row.smtpUser, s.user);
      row.smtpPassEnc = this.applySecret(row.smtpPassEnc, s.password);
      row.smtpFrom = this.applyText(row.smtpFrom, s.from);
    }

    if (dto.oidc) {
      const o = dto.oidc;
      row.oidcIssuer = this.applyText(row.oidcIssuer, o.issuer);
      row.oidcClientId = this.applyText(row.oidcClientId, o.clientId);
      row.oidcClientSecretEnc = this.applySecret(row.oidcClientSecretEnc, o.clientSecret);
      row.oidcRedirectUri = this.applyText(row.oidcRedirectUri, o.redirectUri);
      row.oidcScopes = this.applyText(row.oidcScopes, o.scopes);
      row.oidcProviderName = this.applyText(row.oidcProviderName, o.providerName);
      if (o.disablePasswordLogin !== undefined) row.oidcDisablePasswordLogin = o.disablePasswordLogin;
    }

    await this.repo.save(row);
    this.notifyChanged();
    return this.getPublic();
  }
}
