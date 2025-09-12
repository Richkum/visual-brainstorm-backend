import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { CanvasServiceController } from './canvas-service.controller';
import { CanvasServiceService } from './canvas-service.service';
import { CanvasSchema } from './canvas.schema';
import { MongooseCanvasConfigService } from '../utils/mongoose-canvas-config.service';

import { MongooseAuthConfigService } from '../../auth-service/utils/mongoose-auth-config.service';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useClass: MongooseCanvasConfigService,
    }),

    MongooseModule.forRootAsync({
      useClass: MongooseAuthConfigService,
      connectionName: 'auth',
    }),
    MongooseModule.forFeature([{ name: 'Canvas', schema: CanvasSchema }]),
  ],
  controllers: [CanvasServiceController],
  providers: [CanvasServiceService],
})
export class CanvasServiceModule {}