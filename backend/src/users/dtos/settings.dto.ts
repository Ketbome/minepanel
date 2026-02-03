import { IsOptional, IsString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProxySettingsDto {
  @IsOptional()
  @IsBoolean()
  proxyEnabled?: boolean;

  @IsOptional()
  @IsString()
  proxyBaseDomain?: string;
}

export class NetworkSettingsDto {
  @IsOptional()
  @IsString()
  publicIp?: string;

  @IsOptional()
  @IsString()
  lanIp?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  cfApiKey?: string;

  @IsOptional()
  @IsString()
  discordWebhook?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  preferences?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProxySettingsDto)
  proxy?: ProxySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkSettingsDto)
  network?: NetworkSettingsDto;
}

export class SettingsResponseDto {
  cfApiKey?: string;
  discordWebhook?: string;
  language: string;
  preferences?: Record<string, any>;
  proxy?: {
    enabled: boolean;
    baseDomain: string | null;
    available: boolean;
  };
  network?: {
    publicIp: string | null;
    lanIp: string | null;
  };
}
