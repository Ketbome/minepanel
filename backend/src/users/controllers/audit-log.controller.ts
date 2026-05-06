import { Controller, Get, Query, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueryDto } from '../dtos/audit-log.dto';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get()
  async listAuditLogs(@Request() req, @Query(new ValidationPipe({ transform: true })) query: AuditLogQueryDto) {
    const currentUser = await this.usersService.getRequiredUserById(req.user.userId);
    this.accessControlService.assertManageUsers(currentUser);

    return this.auditLogService.list(query);
  }
}
