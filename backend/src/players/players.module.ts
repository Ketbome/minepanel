import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [UsersModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
