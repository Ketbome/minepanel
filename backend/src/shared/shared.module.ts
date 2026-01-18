import { Module, Global } from '@nestjs/common';
import { RconConsoleStrategy } from './strategies/rcon-console.strategy';
import { AttachConsoleStrategy } from './strategies/attach-console.strategy';
import { DockerComposeFactory } from './factories/docker-compose.factory';

@Global()
@Module({
  providers: [RconConsoleStrategy, AttachConsoleStrategy, DockerComposeFactory],
  exports: [RconConsoleStrategy, AttachConsoleStrategy, DockerComposeFactory],
})
export class SharedModule {}
