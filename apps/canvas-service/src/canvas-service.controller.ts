import { Controller, Get } from '@nestjs/common';
import { CanvasServiceService } from './canvas-service.service';

@Controller()
export class CanvasServiceController {
  constructor(private readonly canvasServiceService: CanvasServiceService) {}

  @Get()
  getHello(): string {
    return this.canvasServiceService.getHello();
  }
}
