import { Module } from '@nestjs/common';
import { BoardController } from './board-service.controller';
import { BoardService } from './board-service.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './config/db-connection.config';
import { BoardSchema } from './board.schema';
import { BoardListenerService } from './config/board-listener.service';
import { MailService } from './config/mail.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
      connectionName: 'boardConnection',
    }),

    MongooseModule.forFeature(
      [{ name: 'Board', schema: BoardSchema }],
      'boardConnection'
    ),
    ClientsModule.register([
      {
        name: 'REALTIME_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
          channel: 'board_events',
        },
      },
    ]),],
  controllers: [BoardController],
  providers: [BoardService, BoardListenerService, MailService],
})
export class BoardModule { }
