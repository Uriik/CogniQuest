import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { GameGateway } from './game.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [LobbyGateway, GameGateway],
})
export class AppModule {}
