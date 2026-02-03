import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyController } from './proxy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from 'src/users/entities/settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings])],
  controllers: [ProxyController],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
