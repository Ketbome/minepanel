import { Module } from '@nestjs/common';
import { CurseforgeService } from './curseforge.service';
import { CurseforgeController } from './curseforge.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [CurseforgeController],
  providers: [CurseforgeService],
  exports: [CurseforgeService],
})
export class CurseforgeModule {}

