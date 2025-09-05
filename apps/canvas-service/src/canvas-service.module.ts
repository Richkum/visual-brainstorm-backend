import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CanvasServiceController } from './canvas-service.controller';
import { CanvasServiceService } from './canvas-service.service';
import { CanvasSchema } from './canvas.schema';
import { MongooseConfigService } from '../../../utils/mongoose.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
    MongooseModule.forFeature([{ name: 'Canvas', schema: CanvasSchema }]),
  ],
  controllers: [CanvasServiceController],
  providers: [CanvasServiceService],
})
export class CanvasServiceModule {}
