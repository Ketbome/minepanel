import { Module } from '@nestjs/common';
import { VersionController } from './version.controller';
import { VersionService } from './version.service';
import { UpdaterService } from './updater.service';
import { HostContextService } from 'src/common/docker/host-context.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [VersionController],
  providers: [VersionService, UpdaterService, HostContextService],
})
export class VersionModule {}
