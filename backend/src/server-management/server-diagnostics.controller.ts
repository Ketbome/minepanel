import { Controller, Get, Param, Request } from '@nestjs/common';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { ServerDiagnosticsService } from './server-diagnostics.service';

@Controller('servers')
export class ServerDiagnosticsController {
  constructor(
    private readonly diagnostics: ServerDiagnosticsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  // Crash reports are logs too, so reading them takes the same permission.
  @Get(':id/diagnosis')
  async diagnose(@Request() req, @Param('id') id: string) {
    this.accessControlService.assertViewLogs(await this.usersService.getRequestUser(req.user), id);
    return this.diagnostics.diagnose(id);
  }
}
