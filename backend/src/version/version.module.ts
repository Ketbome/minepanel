import { Module } from '@nestjs/common';
import { VersionController } from './version.controller';
import { VersionService } from './version.service';

@Module({
  controllers: [VersionController],
  providers: [VersionService],
})
export class VersionModule {}
