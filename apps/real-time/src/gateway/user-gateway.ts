import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { EventPattern } from '@nestjs/microservices';

// Apply the WsJwtGuard to secure all connections to this gateway
@WebSocketGateway({
  namespace: '/user', // Personal user notifications
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(UserGateway.name);

  // Apply the guard here. If it fails, handleConnection will still run,
  // but client.data.userId will be missing, causing the connection to be denied below.
  constructor(private readonly wsJwtGuard: WsJwtGuard) { }

  async handleConnection(client: Socket) {
    // Manually run the guard to populate client.data.user (or userId)
    // and catch the WsException if validation fails.
    try {
      await this.wsJwtGuard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as any);
    } catch (e) {
      // The guard failed validation. It already logged the error (see WsJwtGuard.ts).
      // The socket connection is implicitly denied in the next check.
      this.logger.debug(`Guard failed for Socket ID: ${client.id}. Disconnecting.`);
    }

    // After the guard, we check for the required userId
    if (!client.data.userId) {
      this.logger.error(`Connection denied. Socket ID: ${client.id}. Missing userId after guard.`);
      client.disconnect(true);
      return;
    }

    // All clear, user is authenticated
    this.logger.log(`User connected to namespace '/user'. User ID: ${client.data.userId}, Socket ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`User disconnected from namespace '/user'. User ID: ${client.data.userId}, Socket ID: ${client.id}`);
    } else {
      this.logger.warn(`Unauthenticated socket disconnected. Socket ID: ${client.id}`);
    }
  }

  sendPersonalNotification(userId: string, payload: unknown) {
    // Find all sockets connected for this user and emit the notification
    this.server
      .to(userId)
      .emit('personalNotification', payload);
  }

  /**
   * Subscribes a user's socket to their private room (named by their userId).
   * Note: This is usually done automatically in handleConnection, but we ensure it here.
   */
  subscribeToUserRoom(client: Socket) {
    if (client.data.userId) {
      client.join(client.data.userId);
    }
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
