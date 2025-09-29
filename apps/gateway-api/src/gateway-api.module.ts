import { Module } from '@nestjs/common';
import { GatewayController } from './gateway-api.controller';
import { GatewayService } from './gateway-api.service';

@Module({
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GateWayApiModule { }
