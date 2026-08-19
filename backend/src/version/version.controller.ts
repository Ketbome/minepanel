import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { VersionService } from './version.service';

@Controller('version')
@UseGuards(JwtAuthGuard)
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  async getVersion() {
    return this.versionService.getVersionInfo();
  }
}
