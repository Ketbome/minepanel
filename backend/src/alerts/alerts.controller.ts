import { Body, Controller, Get, Param, Put, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { Users } from 'src/users/entities/users.entity';
import { AlertsService } from './alerts.service';
import { UpdateAlertConfigDto } from './dto/update-alert-config.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async requireServerAccess(req, serverId: string): Promise<Users> {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    this.accessControlService.assertServerAccess(user, serverId);
    return user;
  }

  @Get(':serverId')
  async getConfig(@Request() req, @Param('serverId') serverId: string) {
    await this.requireServerAccess(req, serverId);
    return this.alertsService.getConfig(serverId);
  }

  @Put(':serverId')
  async updateConfig(@Request() req, @Param('serverId') serverId: string, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateAlertConfigDto) {
    await this.requireServerAccess(req, serverId);
    return this.alertsService.updateConfig(serverId, dto);
  }
}
