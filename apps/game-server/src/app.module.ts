import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { LobbyGateway } from './lobby.gateway';
import { GameGateway } from './game.gateway';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 10000,
      limit: 30,
    }]),
  ],
  controllers: [],
  providers: [LobbyGateway, GameGateway],
})
export class AppModule {}
