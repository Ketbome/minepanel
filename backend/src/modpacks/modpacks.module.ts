import { Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { UsersModule } from 'src/users/users.module';
import { ModpacksController } from './modpacks.controller';
import { ModpacksService } from './modpacks.service';

@Module({
  imports: [UsersModule, FilesModule],
  controllers: [ModpacksController],
  providers: [ModpacksService],
  exports: [ModpacksService],
})
export class ModpacksModule {}
