import { Module } from '@nestjs/common';
import { CanvasServiceController } from './canvas-service.controller';
import { CanvasServiceService } from './canvas-service.service';

@Module({
  imports: [],
  controllers: [CanvasServiceController],
  providers: [CanvasServiceService],
})
export class CanvasServiceModule {}
