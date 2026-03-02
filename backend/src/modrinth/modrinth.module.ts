import { Module } from '@nestjs/common';
import { ModrinthController } from './modrinth.controller';
import { ModrinthService } from './modrinth.service';

@Module({
  controllers: [ModrinthController],
  providers: [ModrinthService],
  exports: [ModrinthService],
})
export class ModrinthModule {}
