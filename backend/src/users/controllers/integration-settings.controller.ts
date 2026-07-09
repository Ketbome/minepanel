import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { UpdateIntegrationSettingsDto } from 'src/settings/dto/update-integration-settings.dto';
import { AuthMailService } from 'src/auth/auth-mail.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';
import { AuditLogService } from '../services/audit-log.service';

@Controller('settings/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationSettingsController {
  constructor(
    private readonly instanceSettings: InstanceSettingsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly auditLogService: AuditLogService,
    private readonly authMailService: AuthMailService,
  ) {}

  private async requireAdmin(user: PayloadToken) {
    const current = await this.usersService.getRequiredUserById(user.userId);
    this.accessControlService.assertIsAdmin(current);
    return current;
  }

  @Get()
  async getIntegrations(@Request() req) {
    await this.requireAdmin(req.user as PayloadToken);
    return this.instanceSettings.getPublic();
  }

  @Patch()
  async updateIntegrations(@Request() req, @Body() dto: UpdateIntegrationSettingsDto) {
    const user = req.user as PayloadToken;
    await this.requireAdmin(user);

    const result = await this.instanceSettings.updateIntegrations(dto);

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'settings',
      action: 'update_integrations',
      summary: 'Updated integration settings (SMTP/OIDC)',
    });

    return result;
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
}
