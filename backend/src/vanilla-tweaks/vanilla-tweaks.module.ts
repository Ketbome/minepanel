import { Module } from '@nestjs/common';
import { VanillaTweaksController } from './vanilla-tweaks.controller';
import { VanillaTweaksService } from './vanilla-tweaks.service';

@Module({
  controllers: [VanillaTweaksController],
  providers: [VanillaTweaksService],
  exports: [VanillaTweaksService],
})
export class VanillaTweaksModule {}
