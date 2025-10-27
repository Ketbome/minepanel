import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { UpdateSettingsDto } from '../dtos/settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { DiscordService } from 'src/discord/discord.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly discordService: DiscordService,
  ) {}

  @Get()
  getSettings(@Request() req) {
    const user = req.user as PayloadToken;
    return this.settingsService.getSettings(user.userId);
  }

  @Patch()
  updateSettings(@Request() req, @Body() dto: UpdateSettingsDto) {
    const user = req.user as PayloadToken;
    return this.settingsService.updateSettings(dto, user.userId);
  }

  @Post('test-discord-webhook')
  async testDiscordWebhook(@Request() req) {
    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);

    if (!settings?.discordWebhook) {
      const errorMsg = { es: 'No hay webhook configurado', en: 'No Discord webhook configured' };
      return { success: false, message: errorMsg[settings?.language as 'en' | 'es'] || errorMsg.es };
    }

    return this.discordService.testWebhook(settings.discordWebhook, settings.language as 'en' | 'es');
  }
}
