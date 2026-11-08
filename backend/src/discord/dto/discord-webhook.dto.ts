import { IsBoolean, IsObject, IsOptional, IsString, Length, Matches } from 'class-validator';
import { DISCORD_WEBHOOK_INVALID_MESSAGE, DISCORD_WEBHOOK_URL_PATTERN } from '../discord-webhook-url';

export class CreateDiscordWebhookDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsString()
  @Matches(DISCORD_WEBHOOK_URL_PATTERN, { message: DISCORD_WEBHOOK_INVALID_MESSAGE })
  url: string;

  // A shared webhook is usable from every server and keeps the server name in
  // each message, so one channel can follow several servers.
  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

export class UpdateDiscordWebhookDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(DISCORD_WEBHOOK_URL_PATTERN, { message: DISCORD_WEBHOOK_INVALID_MESSAGE })
  url?: string;

  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

// Values: a webhook id, null for "off", or 'instance' to fall back to the
// Minepanel-wide Discord channel. Keys and ids are validated by the service.
export class UpdateDiscordRoutesDto {
  @IsObject()
  routes: Record<string, number | null | 'instance'>;
}
