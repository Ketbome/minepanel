import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { UpdateSettingsDto } from '../dtos/settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { DiscordService, SupportedLanguage } from 'src/discord/discord.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly discordService: DiscordService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get()
  async getSettings(@Request() req) {
    const user = req.user as PayloadToken;
    const [settings, proxy, network] = await Promise.all([this.settingsService.getSettings(user.userId), this.settingsService.getProxySettings(user.userId), this.settingsService.getNetworkSettings(user.userId)]);

    return {
      ...settings,
      proxy,
      network,
      javaServerDefaults: settings.preferences?.javaServerDefaults ?? null,
    };
  }

  @Patch()
  async updateSettings(@Request() req, @Body() dto: UpdateSettingsDto) {
    const user = req.user as PayloadToken;

    if (dto.proxy || dto.network || dto.javaServerDefaults) {
      const currentUser = await this.usersService.getRequiredUserById(user.userId);
      this.accessControlService.assertManageSystemSettings(currentUser);
    }

    return this.settingsService.updateSettings(dto, user.userId);
  }

  @Post('test-discord-webhook')
  async testDiscordWebhook(@Request() req) {
    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);

    if (!settings?.discordWebhook) {
      const errorMsg = { es: 'No hay webhook configurado', en: 'No Discord webhook configured', nl: 'Geen Discord webhook geconfigureerd' };
      const lang = (settings?.language as SupportedLanguage) || 'es';
      return { success: false, message: errorMsg[lang] };
    }

    return this.discordService.testWebhook(settings.discordWebhook, (settings.language as SupportedLanguage) || 'es');
  }
}
