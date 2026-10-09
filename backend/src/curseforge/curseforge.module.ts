import { Module, forwardRef } from '@nestjs/common';
import { CurseforgeService } from './curseforge.service';
import { CurseforgeController } from './curseforge.controller';
import { UsersModule } from '../users/users.module';

@Module({
  // UsersModule imports this module for the settings key check, hence the forwardRef.
  imports: [forwardRef(() => UsersModule)],
  controllers: [CurseforgeController],
  providers: [CurseforgeService],
  exports: [CurseforgeService],
})
export class CurseforgeModule {}

