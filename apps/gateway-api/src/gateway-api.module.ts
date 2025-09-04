import { Module } from '@nestjs/common';
import { GatewayApiController } from './gateway-api.controller';
import { GatewayApiService } from './gateway-api.service';
<<<<<<< HEAD
import { HttpModule } from '@nestjs/axios';
=======
import { GatewayGateway } from './gateway.gateway';
>>>>>>> 7822982 (created socket connection backend)

@Module({
  imports: [HttpModule],
  controllers: [GatewayApiController],
  providers: [GatewayApiService, GatewayGateway],
})
export class GatewayApiModule {}
