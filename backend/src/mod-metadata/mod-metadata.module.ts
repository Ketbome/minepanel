import { Module } from '@nestjs/common';
import { ModMetadataController } from './mod-metadata.controller';
import { ModMetadataService } from './mod-metadata.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ModMetadataController],
  providers: [ModMetadataService],
  exports: [ModMetadataService],
})
export class ModMetadataModule {}
