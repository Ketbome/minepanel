import { BadRequestException, Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { UpdateIntegrationSettingsDto } from 'src/settings/dto/update-integration-settings.dto';
import { AuthMailService } from 'src/auth/auth-mail.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';
import { AuditLogService } from '../services/audit-log.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { IsIn } from 'class-validator';

export class TestNotificationDto {
  @IsIn(['discord', 'email', 'telegram'])
  channel: 'discord' | 'email' | 'telegram';
}

@Controller('settings/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationSettingsController {
  constructor(
    private readonly instanceSettings: InstanceSettingsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly auditLogService: AuditLogService,
    private readonly authMailService: AuthMailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async requireAdmin(user: PayloadToken) {
    const current = await this.usersService.getRequiredUserById(user.userId);
    this.accessControlService.assertIsAdmin(current);
    return current;
  }

  // Turning SSO-only on while no admin is linked to the provider leaves nobody
  // able to sign in, and the flag lives in the database, so editing .env does
  // not undo it either.
  private async assertSsoOnlyIsRecoverable(dto: UpdateIntegrationSettingsDto): Promise<void> {
    if (dto.oidc?.disablePasswordLogin !== true) {
      return;
    }

    const current = await this.instanceSettings.getOidc();
    if (current.disablePasswordLogin) {
      return;
    }

    if (!(await this.usersService.hasSsoCapableAdmin())) {
      throw new BadRequestException(
        'No admin account is linked to single sign-on yet. Sign in through SSO with an admin account (or promote an SSO account to admin under Settings > Access) before disabling password login.',
      );
    }
  }

  @Get()
  async getIntegrations(@Request() req) {
    await this.requireAdmin(req.user as PayloadToken);
    return { ...await this.instanceSettings.getPublic(), notificationDelivery: this.notificationsService.getDeliveryState(), systemDiscordConfigured: await this.notificationsService.isDiscordConfigured() };
  }

  @Patch()
  async updateIntegrations(@Request() req, @Body() dto: UpdateIntegrationSettingsDto) {
    const user = req.user as PayloadToken;
    await this.requireAdmin(user);
    await this.assertSsoOnlyIsRecoverable(dto);

    const result = await this.instanceSettings.updateIntegrations(dto);

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'settings',
      action: 'update_integrations',
      summary: 'Updated integration settings (SMTP/OIDC/notifications)',
    });

    return { ...result, notificationDelivery: this.notificationsService.getDeliveryState(), systemDiscordConfigured: await this.notificationsService.isDiscordConfigured() };
  }

  @Post('smtp/test')
  async testSmtp(@Request() req) {
    const user = await this.requireAdmin(req.user as PayloadToken);
    if (!user.email) {
      return { success: false, message: 'Your account has no email address to send the test to' };
    }

    try {
      await this.authMailService.sendTestEmail(user.email);
      return { success: true, message: `Test email sent to ${user.email}` };
    } catch (error) {
      return { success: false, message: error?.message ?? 'Failed to send test email' };
    }
  }

  @Post('notifications/test')
  async testNotification(@Request() req, @Body() dto: TestNotificationDto) {
    await this.requireAdmin(req.user as PayloadToken);
    return this.notificationsService.testChannel(dto.channel);
  }
}
