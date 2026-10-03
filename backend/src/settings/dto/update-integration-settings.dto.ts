import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

// Secret fields (smtpPassword, oidcClientSecret) are write-only:
// - omitted   -> keep the current value
// - ''        -> clear the value
// - non-empty -> set the new value
export class SmtpSettingsDto {
  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class OidcSettingsDto {
  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;

  @IsOptional()
  @IsString()
  scopes?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsBoolean()
  disablePasswordLogin?: boolean;
}

export class NotificationSettingsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  discordEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  emailEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(254)
  @Matches(/^$|^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/)
  emailTo?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  telegramEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(256)
  @Matches(/^$|^\d+:[A-Za-z0-9_-]+$/)
  telegramToken?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  @Matches(/^$|^-?\d+$|^@[A-Za-z0-9_]+$/)
  telegramChatId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  lifecycleEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  alertsEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  diskAlertEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  backupFailureEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  recoveryEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(50)
  diskFreeThresholdPercent?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(10080)
  alertCooldownMinutes?: number;


  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  taskFailureEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  gameAlertEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  staleBackupEnabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(30)
  gameFailureSamples?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1440)
  gameStartupGraceMinutes?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(10080)
  staleBackupToleranceMinutes?: number;

}

export class UpdateIntegrationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpSettingsDto)
  smtp?: SmtpSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OidcSettingsDto)
  oidc?: OidcSettingsDto;
}
