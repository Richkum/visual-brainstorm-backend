import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { GatewayModule } from '../gateway/gateway.module'; // Import auth dependency

@Module({
  imports: [GatewayModule],
  providers: [BoardGateway],
})
export class BoardGatewayModule { }