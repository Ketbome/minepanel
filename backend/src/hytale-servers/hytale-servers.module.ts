import { Module } from '@nestjs/common';
import { HytaleServersController } from './hytale-servers.controller';
import { HytaleServersService } from './hytale-servers.service';
import { HytaleConsoleGateway } from './hytale-console.gateway';

@Module({
  controllers: [HytaleServersController],
  providers: [HytaleServersService, HytaleConsoleGateway],
  exports: [HytaleServersService],
})
export class HytaleServersModule {}
