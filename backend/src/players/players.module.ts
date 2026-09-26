import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ItemTexturesController, PlayersController } from './players.controller';
import { ItemTexturesService } from './item-textures.service';
import { PlayersService } from './players.service';

@Module({
  imports: [UsersModule],
  controllers: [PlayersController, ItemTexturesController],
  providers: [PlayersService, ItemTexturesService],
  exports: [PlayersService],
})
export class PlayersModule {}
