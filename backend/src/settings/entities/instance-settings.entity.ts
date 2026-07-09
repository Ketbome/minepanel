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
