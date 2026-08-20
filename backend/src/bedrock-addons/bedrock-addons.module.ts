import { Module } from '@nestjs/common';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { UsersModule } from 'src/users/users.module';
import { BedrockAddonsController } from './bedrock-addons.controller';
import { BedrockAddonsService } from './bedrock-addons.service';

@Module({
  imports: [UsersModule],
  controllers: [BedrockAddonsController],
  providers: [BedrockAddonsService, DockerComposeService, ServerStoreService],
  exports: [BedrockAddonsService],
})
export class BedrockAddonsModule {}
