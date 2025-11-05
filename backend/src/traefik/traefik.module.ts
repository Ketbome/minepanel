import { Module } from '@nestjs/common';
import { TraefikService } from './traefik.service';

@Module({
  providers: [TraefikService],
  exports: [TraefikService],
})
export class TraefikModule {}

