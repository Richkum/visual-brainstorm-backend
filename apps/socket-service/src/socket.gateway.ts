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
import { SocketServiceService } from './socket-service.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly socketService: SocketServiceService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected to socket service: ${client.id}`);

    // Store socket connection in database
    await this.socketService.createSocketConnection({
      socketId: client.id,
      userId: client.handshake.query.userId as string || 'anonymous',
      rooms: [],
      isConnected: true,
      userAgent: client.handshake.headers['user-agent'],
      ipAddress: client.handshake.address,
    });
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected from socket service: ${client.id}`);

    // Update socket connection status
    await this.socketService.updateSocketConnection(client.id, {
      isConnected: false,
    });

    // Leave all rooms on disconnect
    client.rooms.forEach(room => {
      if (room !== client.id) {
        client.leave(room);
        this.server.to(room).emit('userLeft', { userId: client.id });
      }
    });
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`User ${data.userId} joined room ${data.roomId}`);

    // Update socket connection with room
    const socketConnection = await this.socketService.findSocketById(client.id);
    if (socketConnection) {
      const updatedRooms = [...socketConnection.rooms];
      if (!updatedRooms.includes(data.roomId)) {
        updatedRooms.push(data.roomId);
        await this.socketService.updateSocketConnection(client.id, { rooms: updatedRooms });
      }
    }

    this.server.to(data.roomId).emit('userJoined', { userId: data.userId });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    console.log(`User ${data.userId} left room ${data.roomId}`);

    // Update socket connection by removing room
    const socketConnection = await this.socketService.findSocketById(client.id);
    if (socketConnection) {
      const updatedRooms = socketConnection.rooms.filter(room => room !== data.roomId);
      await this.socketService.updateSocketConnection(client.id, { rooms: updatedRooms });
    }

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
  handleDraw(
    @MessageBody() data: { roomId: string; drawData: any; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Draw event from ${data.userId} in room ${data.roomId}`);

    // Broadcast validated draw data to all clients in the room except the sender
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

  // Method to emit events from other services
  async emitToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }

  async emitToUser(userId: string, event: string, data: any) {
    const userSockets = await this.socketService.getConnectionsByUserId(userId);
    userSockets.forEach(socket => {
      this.server.to(socket.socketId).emit(event, data);
    });
  }

  async getActiveConnections() {
    return await this.socketService.getAllActiveConnections();
  }
}
