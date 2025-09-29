import { Module } from '@nestjs/common';
import { RealTimeController } from './real-time.controller';
import { RealtimeService } from './real-time.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BoardGateway } from './board/board.gateway';
import { WsJwtGuard } from './auth/ws-jwt.guard';
import { UserGateway } from './gateway/user-gateway';

@Module({
  imports: [
    // Configure Realtime Service as a client to consume events from the message broker
    ClientsModule.register([
      {
        name: 'REALTIME_SERVICE_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
        },
      },
      // Placeholder for Canvas Service (for future Yjs persistence)
      {
        name: 'CANVAS_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3003 },
      }
    ]),
  ],
  controllers: [RealTimeController],
  providers: [
    RealtimeService,
    BoardGateway,
    WsJwtGuard,
    UserGateway
  ],
})
export class RealTimeModule { }