import { Module } from '@nestjs/common';
import { SocketServiceController } from '../src/socket-service.controller';
import { SocketServiceService } from '../src/socket-service.service';
import { SocketGateway } from './socket.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketSchema } from './socket.schema';
import { ConfigModule } from '@nestjs/config';
import { MongooseSocketConfigService } from '../utils/mongoose-socket-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useClass: MongooseSocketConfigService,
    }),
    MongooseModule.forFeature([{ name: 'Socket', schema: SocketSchema }]),
  ],
  controllers: [SocketServiceController],
  providers: [SocketServiceService, SocketGateway],
})
export class SocketServiceModule {}
