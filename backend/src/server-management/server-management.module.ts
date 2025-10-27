import { Module } from '@nestjs/common';
import { ServerManagementController } from './server-management.controller';
import { ServerManagementService } from './server-management.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';

@Module({
  imports: [],
  controllers: [ServerManagementController],
  providers: [ServerManagementService, DockerComposeService],
})
export class ServerManagementModule {}
