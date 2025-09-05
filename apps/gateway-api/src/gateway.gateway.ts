import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GatewayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly httpService: HttpService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to gateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from gateway: ${client.id}`);
    // Leave all rooms on disconnect
    client.rooms.forEach(room => {
      if (room !== client.id) {
        client.leave(room);
        this.server.to(room).emit('userLeft', { userId: client.id });
      }
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`User ${data.userId} joined room ${data.roomId}`);
    this.server.to(data.roomId).emit('userJoined', { userId: data.userId });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    console.log(`User ${data.userId} left room ${data.roomId}`);
    this.server.to(data.roomId).emit('userLeft', { userId: data.userId });
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: { roomId: string; message: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Message from ${data.userId} in room ${data.roomId}:`, data.message);
    this.server.to(data.roomId).emit('message', {
      message: data.message,
      userId: data.userId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('draw')
  async handleDraw(
    @MessageBody() data: { roomId: string; drawData: any; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Draw event from ${data.userId} in room ${data.roomId}`);

    // Validate and update canvas state via canvas service HTTP API
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'http://localhost:3000/canvas/' + data.roomId + '/draw',
          data.drawData,
        ),
      );
      if (response.data.error) {
        client.emit('error', { message: response.data.error });
        return;
      }
    } catch (error) {
      client.emit('error', { message: 'Canvas service unavailable' });
      return;
    }

    // Broadcast draw data to all clients in the room except the sender
    client.to(data.roomId).emit('draw', {
      drawData: data.drawData,
      userId: data.userId,
    });
  }

  @SubscribeMessage('updateBrainstorm')
  handleUpdateBrainstorm(
    @MessageBody() data: { roomId: string; brainstormData: any; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Brainstorm update from ${data.userId} in room ${data.roomId}`);
    this.server.to(data.roomId).emit('brainstormUpdated', {
      brainstormData: data.brainstormData,
      userId: data.userId,
    });
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Message from ${client.id}:`, data);
    // Echo the message back
    client.emit('message', data);
  }
}
