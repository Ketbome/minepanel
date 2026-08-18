import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { Users } from 'src/users/entities/users.entity';
import { ModMetadataService } from './mod-metadata.service';
import { UpdateDesiredVersionDto } from './dto/update-desired-version.dto';
import { UpdateModNoteDto } from './dto/update-mod-note.dto';
import { QueueModChangeDto } from './dto/queue-mod-change.dto';

@Controller('mod-metadata')
@UseGuards(JwtAuthGuard)
export class ModMetadataController {
  constructor(
    private readonly modMetadataService: ModMetadataService,
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
  async getMetadata(@Request() req, @Param('serverId') serverId: string) {
    await this.requireServerAccess(req, serverId);
    return this.modMetadataService.getMetadata(serverId);
  }

  @Put(':serverId/desired-version')
  async setDesiredVersion(
    @Request() req,
    @Param('serverId') serverId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: UpdateDesiredVersionDto,
  ) {
    await this.requireServerAccess(req, serverId);
    return this.modMetadataService.setDesiredVersion(serverId, body.desiredMcVersion ?? null);
  }

  @Put(':serverId/notes/:ref')
  async setModNote(
    @Request() req,
    @Param('serverId') serverId: string,
    @Param('ref') ref: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: UpdateModNoteDto,
  ) {
    await this.requireServerAccess(req, serverId);
    return this.modMetadataService.setModNote(serverId, ref, body.note);
  }

  @Post(':serverId/queue')
  async queueChange(
    @Request() req,
    @Param('serverId') serverId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: QueueModChangeDto,
  ) {
    await this.requireServerAccess(req, serverId);
    return this.modMetadataService.queueChange(serverId, body);
  }

  @Delete(':serverId/queue/:provider/:ref')
  async cancelQueuedChange(
    @Request() req,
    @Param('serverId') serverId: string,
    @Param('provider') provider: 'curseforge' | 'modrinth',
    @Param('ref') ref: string,
  ) {
    await this.requireServerAccess(req, serverId);
    return this.modMetadataService.cancelQueuedChange(serverId, provider, ref);
  }
}
