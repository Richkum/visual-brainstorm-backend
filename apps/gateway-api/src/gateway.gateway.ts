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

  @SubscribeMessage('createBoard')
  async handleCreateBoard(
    @MessageBody() data: { roomId: string; name: string; creator: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Call canvas service REST API to create board
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:3004/canvas/create', {
          roomId: data.roomId,
          name: data.name,
          creator: data.creator,
        }),
      );
      if (response.data.error) {
        client.emit('error', { message: response.data.error });
        return;
      }
      // Join the newly created board room
      client.join(data.roomId);
      this.server.to(data.roomId).emit('boardCreated', {
        roomId: data.roomId,
        name: data.name,
        creator: data.creator,
      });
    } catch (error) {
      client.emit('error', { message: 'Canvas service unavailable' });
    }
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

    // Validate drawData structure for Konva shapes
    const validatedDrawData = this.validateDrawData(data.drawData);
    if (!validatedDrawData) {
      client.emit('error', { message: 'Invalid drawData structure' });
      return;
    }

    // Validate and update canvas state via canvas service HTTP API
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'http://localhost:3004/canvas/' + data.roomId + '/draw',
          validatedDrawData,
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

    // Broadcast validated draw data to all clients in the room except the sender
    client.to(data.roomId).emit('draw', {
      drawData: validatedDrawData,
      userId: data.userId,
    });
  }

 // Improved validation in GatewayGateway

private validateDrawData(drawData: any): any | null {
  if (!drawData || typeof drawData !== 'object') {
    return null;
  }

  // Required properties for all shapes
  const baseValidation = {
    id: drawData.id || crypto.randomUUID(),
    type: drawData.type,
    x: typeof drawData.x === 'number' ? drawData.x : 0,
    y: typeof drawData.y === 'number' ? drawData.y : 0,
    color: typeof drawData.color === 'string' ? drawData.color : '#000000',
  };

  // Type-specific validation
  switch (drawData.type) {
    case 'line':
      if (!Array.isArray(drawData.points)) {
        console.warn('Invalid line: points must be an array');
        return null;
      }
      // More lenient - accept lines with at least 2 points (x,y pair)
      if (drawData.points.length < 2) {
        console.warn('Invalid line: points must have at least 2 coordinates');
        return null;
      }
      // Ensure even number of coordinates (x,y pairs)
      const validPointsLength = Math.floor(drawData.points.length / 2) * 2;
      return {
        ...baseValidation,
        type: 'line',
        points: drawData.points.slice(0, validPointsLength).map((p: any) => typeof p === 'number' ? p : 0),
        width: 0,
        height: 0,
        text: '',
      };

    case 'rectangle':
    case 'circle':
      const width = typeof drawData.width === 'number' ? drawData.width : 0;
      const height = typeof drawData.height === 'number' ? drawData.height : 0;
      // Allow zero dimensions for shapes being drawn
      if (width < 0 || height < 0) {
        console.warn(`Invalid ${drawData.type}: width and height cannot be negative`);
        return null;
      }
      return {
        ...baseValidation,
        type: drawData.type,
        points: [],
        width: Math.abs(width), // Ensure positive values
        height: Math.abs(height),
        text: '',
      };

    case 'text':
      if (typeof drawData.text !== 'string') {
        console.warn('Invalid text: text must be a string');
        return null;
      }
      return {
        ...baseValidation,
        type: 'text',
        points: [],
        width: 0,
        height: 0,
        text: drawData.text,
      };

    default:
      console.warn(`Unsupported shape type: ${drawData.type}`);
      return null;
  }
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
