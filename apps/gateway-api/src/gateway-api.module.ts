import { Module } from '@nestjs/common';
import { GatewayApiController } from './gateway-api.controller';
import { GatewayApiService } from './gateway-api.service';
import { HttpModule } from '@nestjs/axios';
import { GatewayGateway } from './gateway.gateway';

@Module({
  imports: [HttpModule],
  controllers: [GatewayApiController],
  providers: [GatewayApiService, GatewayGateway],
})
export class GatewayApiModule {}
