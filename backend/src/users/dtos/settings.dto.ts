import { IsOptional, IsString, IsBoolean, IsEnum, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// mc-router container settings. The panel generates the router's compose file,
// so these replaced the MC_PROXY_* variables that used to live in .env.
export class ProxyRouterSettingsDto {
  @IsOptional()
  @IsString()
  proxyPort?: string;

  @IsOptional()
  @IsBoolean()
  autoScaleEnabled?: boolean;

  @IsOptional()
  @IsString()
  autoScaleDownAfter?: string;

  @IsOptional()
  @IsString()
  autoScaleWakeTimeout?: string;

  @IsOptional()
  @IsString()
  autoScaleAsleepMotd?: string;

  @IsOptional()
  @IsString()
  autoScaleLoadingMotd?: string;

  @IsOptional()
  @IsString()
  extraNetworks?: string;
}

export class ProxyPowerDto {
  @IsBoolean()
  enabled: boolean;
}

export class ProxySettingsDto {
  @IsOptional()
  @IsBoolean()
  proxyEnabled?: boolean;

  @IsOptional()
  @IsString()
  proxyBaseDomain?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProxyRouterSettingsDto)
  router?: ProxyRouterSettingsDto;
}

export class NetworkSettingsDto {
  @IsOptional()
  @IsString()
  publicIp?: string;

  @IsOptional()
  @IsString()
  lanIp?: string;
}

export class JavaServerDefaultsDto {
  @IsOptional()
  @IsBoolean()
  onlineMode?: boolean;

  @IsOptional()
  @IsString()
  maxPlayers?: string;

  @IsOptional()
  @IsString()
  initMemory?: string;

  @IsOptional()
  @IsString()
  maxMemory?: string;

  @IsOptional()
  @IsString()
  cpuLimit?: string;

  @IsOptional()
  @IsString()
  cpuReservation?: string;

  @IsOptional()
  @IsString()
  memoryReservation?: string;

  @IsOptional()
  @IsEnum(['peaceful', 'easy', 'normal', 'hard'])
  difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';

  @IsOptional()
  @IsEnum(['survival', 'creative', 'adventure', 'spectator'])
  gameMode?: 'survival' | 'creative' | 'adventure' | 'spectator';

  @IsOptional()
  @IsBoolean()
  pvp?: boolean;

  @IsOptional()
  @IsBoolean()
  allowFlight?: boolean;

  @IsOptional()
  @IsBoolean()
  commandBlock?: boolean;

  @IsOptional()
  @IsString()
  viewDistance?: string;

  @IsOptional()
  @IsString()
  simulationDistance?: string;

  @IsOptional()
  @IsBoolean()
  enableAutoStop?: boolean;

  @IsOptional()
  @IsString()
  autoStopTimeoutEst?: string;

  @IsOptional()
  @IsBoolean()
  enableAutoPause?: boolean;

  @IsOptional()
  @IsString()
  autoPauseTimeoutEst?: string;

  @IsOptional()
  @IsBoolean()
  enableBackup?: boolean;
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
  @IsInt()
  @Min(1)
  @Max(365)
  auditRetentionDays?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProxySettingsDto)
  proxy?: ProxySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkSettingsDto)
  network?: NetworkSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => JavaServerDefaultsDto)
  javaServerDefaults?: JavaServerDefaultsDto;
}

export class SettingsResponseDto {
  hasCfApiKey?: boolean;
  hasDiscordWebhook?: boolean;
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
  javaServerDefaults?: JavaServerDefaultsDto | null;
  auditRetentionDays?: number;
}
