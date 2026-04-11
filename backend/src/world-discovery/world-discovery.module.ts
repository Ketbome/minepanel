import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { WorldDiscoveryController } from './world-discovery.controller';
import { WorldDiscoveryService } from './world-discovery.service';

@Module({
  imports: [UsersModule],
  controllers: [WorldDiscoveryController],
  providers: [WorldDiscoveryService],
  exports: [WorldDiscoveryService],
})
export class WorldDiscoveryModule {}
