import { Controller, Get } from '@nestjs/common';
import { GatewayApiService } from './gateway-api.service';

@Controller()
export class GatewayApiController {
  constructor(private readonly gatewayApiService: GatewayApiService) {}

  @Get()
  getHello(): string {
    return this.gatewayApiService.getHello();
  }
}
