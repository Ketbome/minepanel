import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ModpacksController } from './modpacks.controller';
import { ModpacksService } from './modpacks.service';

@Module({
  imports: [UsersModule],
  controllers: [ModpacksController],
  providers: [ModpacksService],
  exports: [ModpacksService],
})
export class ModpacksModule {}
