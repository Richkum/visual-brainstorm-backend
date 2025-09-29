import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Injectable, Logger } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { EventPattern } from '@nestjs/microservices';

@Injectable()
@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'user', // Ensures user traffic is separate from board traffic
})
export class UserGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(UserGateway.name);

  handleConnection(client: Socket) {
    const { userId } = client.data;

    if (!userId) {
      // This should never happen if WsJwtGuard passes, but it's a safety check
      this.logger.error(`Connection denied. Socket ID: ${client.id}. Missing userId after guard.`);
      client.disconnect(true);
      return;
    }

    // Sockets join a private room named after their ID
    client.join(`user-${userId}`);
    this.logger.log(`User connected to namespace '/user'. Socket ID: ${client.id}, User ID: ${userId}. Joined room 'user-${userId}'.`);
    client.emit('connectionStatus', { status: 'connected', userId });
  }


  @EventPattern('board.access.responded')
  handleAccessResponded(payload: {
    boardId: string;
    boardTitle: string;
    userId: string; // Target user ID for notification
    status: 'approved' | 'denied';
    role: string;
  }) {
    this.logger.debug(`Received ACCESS_RESPONSE for user-${payload.userId}.`);
    // Notify the specific user's socket room
    this.server.to(`user-${payload.userId}`).emit('personalNotification', {
      type: 'ACCESS_RESPONSE',
      status: payload.status,
      message: `Your request for ${payload.boardTitle} was ${payload.status}.`,
      boardId: payload.boardId,
    });
  }

  @EventPattern('board.invite.created')
  handleInviteCreated(payload: {
    boardId: string;
    boardTitle: string;
    targetUserId?: string; // Published from BoardListenerService
    token: string;
  }) {
    this.logger.debug(`Received NEW_INVITE for user-${payload.targetUserId}.`);
    // Only notify if the target user is known and logged in
    if (payload.targetUserId) {
      this.server.to(`user-${payload.targetUserId}`).emit('personalNotification', {
        type: 'NEW_INVITE',
        message: `You've been invited to join the board "${payload.boardTitle}".`,
        boardId: payload.boardId,
        token: payload.token,
      });
    }
  }

  @EventPattern('board.access.requested')
  handleAccessRequested(payload: {
    boardId: string;
    boardTitle: string;
    ownerId?: string; // Published from BoardListenerService
    requesterEmail: string;
    requestedRole: string;
  }) {
    this.logger.debug(`Received ACCESS_REQUEST for owner-${payload.ownerId}.`);
    // Notify the board owner that a request has been made
    if (payload.ownerId) {
      this.server.to(`user-${payload.ownerId}`).emit('personalNotification', {
        type: 'ACCESS_REQUEST',
        message: `${payload.requesterEmail} requested ${payload.requestedRole} access to your board "${payload.boardTitle}".`,
        boardId: payload.boardId,
      });
    }
  }
}
