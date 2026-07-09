import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstanceSettings } from './entities/instance-settings.entity';
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
export class InstanceSettingsService {
  private resetHandlers: Array<() => void> = [];

  constructor(
    @InjectRepository(InstanceSettings)
    private readonly repo: Repository<InstanceSettings>,
    private readonly configService: ConfigService,
  ) {}

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
