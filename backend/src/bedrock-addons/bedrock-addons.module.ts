import { Module } from '@nestjs/common';
import { DockerComposeModule } from 'src/docker-compose/docker-compose.module';
import { UsersModule } from 'src/users/users.module';
import { BedrockAddonsController } from './bedrock-addons.controller';
import { BedrockAddonsService } from './bedrock-addons.service';

@Module({
  imports: [DockerComposeModule, UsersModule],
  controllers: [BedrockAddonsController],
  providers: [BedrockAddonsService],
  exports: [BedrockAddonsService],
})
export class BedrockAddonsModule {}
