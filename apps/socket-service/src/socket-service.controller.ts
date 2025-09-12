import { Controller, Get, Post, Body } from '@nestjs/common';
import { SocketServiceService } from '../src/socket-service.service';
import { SocketGateway } from './socket.gateway';

@Controller('socket')
export class SocketServiceController {
  constructor(
    private readonly socketServiceService: SocketServiceService,
    private readonly socketGateway: SocketGateway,
  ) {}

  @Get()
  getStatus(): string {
    return 'Socket service is running';
  }

  @Get('connections')
  async getActiveConnections() {
    return await this.socketGateway.getActiveConnections();
  }

  @Post('emit/room')
  async emitToRoom(@Body() body: { roomId: string; event: string; data: any }) {
    await this.socketGateway.emitToRoom(body.roomId, body.event, body.data);
    return { success: true, message: `Event emitted to room ${body.roomId}` };
  }

  @Post('emit/user')
  async emitToUser(@Body() body: { userId: string; event: string; data: any }) {
    await this.socketGateway.emitToUser(body.userId, body.event, body.data);
    return { success: true, message: `Event emitted to user ${body.userId}` };
  }
}
