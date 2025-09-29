import { Controller, Get } from '@nestjs/common';
import { RealtimeService } from './real-time.service';

@Controller()
export class RealTimeController {
  constructor(private readonly realTimeService: RealtimeService) { }

  @Get()
  getHello(): string {
    return this.realTimeService.getHello();
  }
}