import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Global (instance-wide) integration settings. A single row (id = 1) holds the
// SMTP and OIDC configuration that can also be provided via .env. Secret columns
// (*_enc) store AES-GCM ciphertext; see common/crypto/secret-cipher.
@Entity('instance_settings')
export class InstanceSettings {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  // SMTP
  @Column({ type: 'text', nullable: true, name: 'smtp_host' })
  smtpHost?: string | null;

  @Column({ type: 'int', nullable: true, name: 'smtp_port' })
  smtpPort?: number | null;

  @Column({ type: 'boolean', nullable: true, name: 'smtp_secure' })
  smtpSecure?: boolean | null;

  @Column({ type: 'text', nullable: true, name: 'smtp_user' })
  smtpUser?: string | null;

  @Column({ type: 'text', nullable: true, name: 'smtp_pass_enc' })
  smtpPassEnc?: string | null;

  @Column({ type: 'text', nullable: true, name: 'smtp_from' })
  smtpFrom?: string | null;

  // Proxy and host networking. These decide how every server's compose file is
  // generated, so they belong to the instance rather than to whichever user
  // happened to save them.
  @Column({ type: 'boolean', nullable: true, name: 'proxy_enabled' })
  proxyEnabled?: boolean | null;

  @Column({ type: 'text', nullable: true, name: 'proxy_base_domain' })
  proxyBaseDomain?: string | null;

  @Column({ type: 'text', nullable: true, name: 'public_ip' })
  publicIp?: string | null;

  @Column({ type: 'text', nullable: true, name: 'lan_ip' })
  lanIp?: string | null;

  @Column({ type: 'json', nullable: true, name: 'java_server_defaults' })
  javaServerDefaults?: Record<string, unknown> | null;

  // mc-router container settings. The panel owns the router's compose file, so
  // these replace the MC_PROXY_* variables that used to live in .env.
  @Column({ type: 'text', nullable: true, name: 'proxy_port' })
  proxyPort?: string | null;

  @Column({ type: 'boolean', nullable: true, name: 'autoscale_enabled' })
  autoScaleEnabled?: boolean | null;

  @Column({ type: 'text', nullable: true, name: 'autoscale_token_enc' })
  autoScaleTokenEnc?: string | null;

  @Column({ type: 'text', nullable: true, name: 'autoscale_down_after' })
  autoScaleDownAfter?: string | null;

  @Column({ type: 'text', nullable: true, name: 'autoscale_wake_timeout' })
  autoScaleWakeTimeout?: string | null;

  @Column({ type: 'text', nullable: true, name: 'autoscale_asleep_motd' })
  autoScaleAsleepMotd?: string | null;

  @Column({ type: 'text', nullable: true, name: 'autoscale_loading_motd' })
  autoScaleLoadingMotd?: string | null;

  // Escape hatch: extra external networks to attach the generated router to, one
  // per line. Without it, regenerating would drop hand-added networks.
  @Column({ type: 'text', nullable: true, name: 'proxy_extra_networks' })
  proxyExtraNetworks?: string | null;

  // Set once the values above have been lifted out of a user's preferences, so
  // clearing one of them does not get undone on the next boot.
  @Column({ type: 'boolean', default: false, name: 'preferences_migrated' })
  preferencesMigrated: boolean;

  // OIDC
  @Column({ type: 'text', nullable: true, name: 'oidc_issuer' })
  oidcIssuer?: string | null;

  @Column({ type: 'text', nullable: true, name: 'oidc_client_id' })
  oidcClientId?: string | null;

  @Column({ type: 'text', nullable: true, name: 'oidc_client_secret_enc' })
  oidcClientSecretEnc?: string | null;

  @Column({ type: 'text', nullable: true, name: 'oidc_redirect_uri' })
  oidcRedirectUri?: string | null;

  @Column({ type: 'text', nullable: true, name: 'oidc_scopes' })
  oidcScopes?: string | null;

  @Column({ type: 'text', nullable: true, name: 'oidc_provider_name' })
  oidcProviderName?: string | null;

  @Column({ type: 'boolean', nullable: true, name: 'oidc_disable_password_login' })
  oidcDisablePasswordLogin?: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
