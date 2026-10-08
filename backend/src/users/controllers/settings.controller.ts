import { Controller, Get, Patch, Post, Body, UseGuards, Request, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { ProxyRouterService } from 'src/proxy/proxy-router.service';
import { VelocityRuntimeService } from 'src/proxy/velocity-runtime.service';
import { ProxyPowerDto, TestCurseforgeKeyDto, UpdateSettingsDto } from '../dtos/settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { DiscordService, SupportedLanguage } from 'src/discord/discord.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';
import { AuditLogService } from '../services/audit-log.service';
import { CurseforgeService } from 'src/curseforge/curseforge.service';

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
    private readonly proxyRouter: ProxyRouterService,
    private readonly velocity: VelocityRuntimeService,
    private readonly curseforgeService: CurseforgeService,
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

  /**
   * Turns the edge container (mc-router or Velocity) on or off straight away.
   *
   * Same flag the settings form saves, but as a direct action: the container is a
   * thing you switch on, so it should not need a form save to react. Binding a
   * host port is host-affecting, hence the same permission as the settings.
   */
  @Post('proxy/power')
  async setProxyPower(@Request() req, @Body() body: ProxyPowerDto) {
    const user = req.user as PayloadToken;
    const currentUser = await this.usersService.getRequiredUserById(user.userId);
    this.accessControlService.assertManageSystemSettings(currentUser);

    const proxy = await this.instanceSettings.setProxy({ enabled: body.enabled });
    await this.settingsService.reconcileEdge(proxy.mode);
    const name = proxy.mode === 'velocity' ? 'Velocity' : 'mc-router';

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'settings',
      action: body.enabled ? 'start_proxy' : 'stop_proxy',
      summary: body.enabled ? `Started the ${name} proxy` : `Stopped the ${name} proxy`,
    });

    const edge = proxy.mode === 'velocity' ? this.velocity : this.proxyRouter;
    const running = await edge.isRunning();
    if (body.enabled && !running) {
      throw new ServiceUnavailableException(`${name} did not start: ${edge.startError ?? 'see the backend log'}`);
    }
    return { ...proxy, running };
  }

  /**
   * Saves the caller's settings. Secrets and instance-wide sections need the system settings
   * permission; a new CurseForge key is also checked, and the result returned as `cfApiKeyCheck`.
   */
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

    // updateSettings strips cfApiKey from the dto once it has encrypted it.
    const newCfApiKey = dto.cfApiKey;
    const updatedSettings = await this.settingsService.updateSettings(dto, user.userId);
    const auditRetentionDays = await this.settingsService.getAuditRetentionDays();

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'settings',
      action: 'update_settings',
      summary: 'Updated panel settings',
    });

    // The key is saved whatever the check says: an outage on CurseForge's side
    // must not stop someone from storing a key that is in fact valid.
    const cfApiKeyCheck = newCfApiKey ? await this.curseforgeService.testApiKey(newCfApiKey) : undefined;

    const { cfApiKey, discordWebhook, ...rest } = updatedSettings;

    return {
      ...rest,
      hasCfApiKey: !!cfApiKey,
      hasDiscordWebhook: !!discordWebhook,
      auditRetentionDays,
      ...(cfApiKeyCheck ? { cfApiKeyCheck } : {}),
    };
  }

  /**
   * Tests a CurseForge key without storing it: the typed one when sent, so it can be checked
   * before saving, otherwise the saved one.
   */
  @Post('test-curseforge-key')
  async testCurseforgeKey(@Request() req, @Body() dto: TestCurseforgeKeyDto) {
    const user = req.user as PayloadToken;
    const currentUser = await this.usersService.getRequiredUserById(user.userId);
    this.accessControlService.assertManageSystemSettings(currentUser);

    const apiKey = dto?.cfApiKey || (await this.settingsService.getCfApiKey(user.userId));
    return this.curseforgeService.testApiKey(apiKey);
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
