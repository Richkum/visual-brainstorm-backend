import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';
import { CanvasSchema } from './canvas.schema';
import { CanvasController } from './canvas-service.controller';
import { CanvasService } from './canvas-service.service';
import { MongooseConfigService } from './config/db-connection-config';
import { ClientsModule, Transport } from '@nestjs/microservices';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
      connectionName: 'canvasConnection',
    }),
    MongooseModule.forFeature([{ name: 'Canvas', schema: CanvasSchema }], 'canvasConnection'),
    ClientsModule.register([
      {
        name: 'REALTIME_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
          channel: 'canvas_events',
        },
      },
    ]),
  ],
  controllers: [CanvasController],
  providers: [CanvasService],
})
export class CanvasServiceModule { }