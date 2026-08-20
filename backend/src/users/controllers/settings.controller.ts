import { Controller, Get, Patch, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { UpdateSettingsDto } from '../dtos/settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { DiscordService, SupportedLanguage } from 'src/discord/discord.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';
import { AuditLogService } from '../services/audit-log.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly discordService: DiscordService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly auditLogService: AuditLogService,
    private readonly instanceSettings: InstanceSettingsService,
  ) {}

  @Get()
  async getSettings(@Request() req) {
    const user = req.user as PayloadToken;
    const [settings, proxy, network, router, auditRetentionDays] = await Promise.all([
      this.settingsService.getSettings(user.userId),
      this.settingsService.getProxySettings(),
      this.settingsService.getNetworkSettings(),
      this.instanceSettings.getRouterSettings(),
      this.settingsService.getAuditRetentionDays(),
    ]);

    const { cfApiKey, discordWebhook, ...rest } = settings;
    const { autoScaleToken: _autoScaleToken, ...routerSettings } = router;

    return {
      ...rest,
      hasCfApiKey: !!cfApiKey,
      hasDiscordWebhook: !!discordWebhook,
      // The token is a shared secret with the router container and never leaves
      // the server. Everything else round-trips, so what the UI reads back is
      // exactly what it may send.
      proxy: { ...proxy, router: routerSettings },
      network,
      javaServerDefaults: await this.instanceSettings.getJavaServerDefaults(),
      auditRetentionDays,
    };
  }

  @Patch()
  async updateSettings(@Request() req, @Body() dto: UpdateSettingsDto) {
    const user = req.user as PayloadToken;

    let currentUser;

    if (dto.cfApiKey !== undefined || dto.discordWebhook !== undefined || dto.proxy || dto.network || dto.javaServerDefaults || dto.auditRetentionDays !== undefined) {
      currentUser = await this.usersService.getRequiredUserById(user.userId);
      this.accessControlService.assertManageSystemSettings(currentUser);
    }

    if (dto.auditRetentionDays !== undefined && currentUser && !this.accessControlService.isAdmin(currentUser)) {
      throw new ForbiddenException('Only admins can manage audit retention');
    }

    const updatedSettings = await this.settingsService.updateSettings(dto, user.userId);
    const auditRetentionDays = await this.settingsService.getAuditRetentionDays();

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'settings',
      action: 'update_settings',
      summary: 'Updated panel settings',
    });

    const { cfApiKey, discordWebhook, ...rest } = updatedSettings;

    return {
      ...rest,
      hasCfApiKey: !!cfApiKey,
      hasDiscordWebhook: !!discordWebhook,
      auditRetentionDays,
    };
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
