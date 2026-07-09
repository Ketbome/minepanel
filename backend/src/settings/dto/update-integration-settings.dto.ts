import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

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

export class UpdateIntegrationSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpSettingsDto)
  smtp?: SmtpSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OidcSettingsDto)
  oidc?: OidcSettingsDto;
}
