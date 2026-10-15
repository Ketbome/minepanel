import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Request, ValidationPipe } from '@nestjs/common';
import { PayloadToken } from './models/token.model';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dtos/api-token.dto';
import { SessionOnly } from './decorators/session-only.decorator';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { AuditLogService } from 'src/users/services/audit-log.service';

type AuthedRequest = { user: PayloadToken };

@Controller('api-tokens')
@SessionOnly()
export class ApiTokensController {
  constructor(
    private readonly apiTokens: ApiTokensService,
    private readonly usersService: UsersService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  async list(@Request() req: AuthedRequest) {
    return this.apiTokens.listOwn(req.user.userId);
  }

  @Get('all')
  async listAll(@Request() req: AuthedRequest) {
    this.accessControl.assertIsAdmin(await this.usersService.getRequestUser(req.user));
    return this.apiTokens.listAll();
  }

  @Post()
  async create(@Request() req: AuthedRequest, @Body(new ValidationPipe()) dto: CreateApiTokenDto) {
    const user = await this.usersService.getRequestUser(req.user);
    const created = await this.apiTokens.create(user, dto);

    await this.audit.record({
      actorUserId: user.id,
      actorUsername: user.username,
      category: 'account',
      action: 'create_api_token',
      summary: `Created API token ${created.name}`,
      metadata: { tokenId: created.id, prefix: created.prefix, admin: created.admin, readOnly: created.readOnly, expiresAt: created.expiresAt },
    });

    return created;
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@Request() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.getRequestUser(req.user);
    const token = await this.apiTokens.revoke(user, id);

    await this.audit.record({
      actorUserId: user.id,
      actorUsername: user.username,
      category: 'account',
      action: 'revoke_api_token',
      summary: `Revoked API token ${token.name}`,
      metadata: { tokenId: token.id, prefix: token.prefix, ownerUserId: token.userId },
    });
  }
}
