import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  WsException,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { EventPattern } from '@nestjs/microservices';
import axios from 'axios';

type BoardRole = 'viewer' | 'commenter' | 'editor' | 'owner';
interface BoardSocket extends Socket {
  data: { userId?: string; role?: BoardRole; boardId?: string; user: any };
}

@WebSocketGateway({
  namespace: '/board',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly API_GATEWAY_URL = 'http://localhost:4001';

  private readonly logger = new Logger(BoardGateway.name);

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
    this.logger.log(`board connected to namespace '/board'. User ID: ${client.data.userId}, Socket ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`User disconnected from namespace '/user'. User ID: ${client.data.userId}, Socket ID: ${client.id}`);
    } else {
      this.logger.warn(`Unauthenticated socket disconnected. Socket ID: ${client.id}`);
    }
  }

  // --- Client Command: Join a Board Room ---
  @SubscribeMessage('joinBoard')
  async handleJoinBoard(client: Socket, payload: { boardId: string }) {
    const { boardId } = payload;
    const { userId } = client.data;
    const authToken = client.handshake.auth.token as string;

    try {
      const res = await axios.get<{
        message: string; isMember: boolean; role: BoardRole
      }>(
        `${this.API_GATEWAY_URL}/board/boards/${boardId}/membership`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-user-id': userId,
          },
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      this.logger.debug(`Membership check response: ${JSON.stringify(res.data)}`);

      if (res.status !== 200 || !res.data.isMember) {
        const errorDetail = res.data?.message || 'Access Denied: Not a member.';
        throw new WsException(errorDetail);
      }

      const memberRole: BoardRole = res.data.role;
      client.data.role = memberRole; // Store role for permission checks
      client.data.boardId = boardId;

      this.logger.log(`User ${userId} joined room ${boardId} as ${memberRole}`);

      client.join(boardId);

      // Fetch initial state from Canvas Service via API Gateway
      const canvasRes = await axios.get<string>(
        `${this.API_GATEWAY_URL}/canvas/${boardId}/state`,
      );
      const stateBase64 = canvasRes.data;

      // 3. Send the full initial state ONLY to the joining client
      client.emit('init-state', stateBase64);
      client.emit('boardJoined', { boardId, status: 'success', role: memberRole });

    } catch (e) {
      const errorMessage = e instanceof WsException ? e.message : 'Forbidden: Internal access check failed.';
      throw new WsException(errorMessage);
    }
  }

  // 💥 FIX 1: Handle Yjs updates from client (persists to DB via Canvas Service & broadcasts)
  @SubscribeMessage('yjsUpdate')
  async handleYjsUpdate(client: BoardSocket, payload: { boardId: string; update: string }) {
    const { boardId, update } = payload;
    const { userId, role } = client.data;

    // Optional: Permission Check - only 'editor' and 'owner' should send Yjs updates
    if (role === 'viewer' || role === 'commenter') {
      this.logger.warn(`User ${userId} (Role: ${role}) tried to send yjsUpdate on board ${boardId}.`);
      return;
    }

    if (!client.rooms.has(boardId)) return; // Client is not in the room

    // 1. Send to Canvas Service for persistence and internal Y.Doc application (HTTP call)
    try {
      // NOTE: We rely on the Canvas Service to handle the Buffer conversion from base64
      await axios.post(
        `${this.API_GATEWAY_URL}/${boardId}/update`,
        { update }, // Payload is { update: updateBase64String }
        // Pass necessary headers for internal Canvas Service security/logging
        { headers: { 'x-user-id': userId, 'x-board-id': boardId } }
      );
    } catch (e) {
      this.logger.error(`Failed to persist Yjs update for board ${boardId}. Error: ${e.message}`);
    }

    // 2. Broadcast the update to all other clients in the room
    client.to(boardId).emit('yjsUpdate', update);
  }

  // 💥 FIX 2: Handle Awareness updates from client (broadcasts only)
  @SubscribeMessage('awarenessUpdate')
  handleAwarenessUpdate(client: BoardSocket, payload: { boardId: string; update: string }) {
    const { boardId, update } = payload;

    if (!client.rooms.has(boardId)) return;

    // Awareness updates are NOT persisted, only broadcast
    client.to(boardId).emit('awarenessUpdate', update);
  }

  // --- Board Service Event Listeners (Relaying Updates) ---
  // ... (rest of the EventPattern handlers remain the same) ...

  @EventPattern('board.created')
  handleBoardCreated(payload: { boardId: string; boardTitle: string; ownerId: string }) {
    this.server.emit('globalUpdate', {
      type: 'BOARD_CREATED',
      message: `New board "${payload.boardTitle}" created.`,
      boardId: payload.boardId
    });
  }

  @EventPattern('board.member.added')
  handleMemberAdded(payload: { boardId: string; userId: string; email: string; role: BoardRole; boardTitle: string }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'MEMBER_ADDED',
      memberId: payload.userId,
      message: `${payload.email} joined the board as ${payload.role}.`,
      boardId: payload.boardId,
    });
  }

  @EventPattern('board.member.removed')
  handleMemberRemoved(payload: { boardId: string; targetUserId: string; removedBy: string }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'MEMBER_REMOVED',
      memberId: payload.targetUserId,
      message: `A member was removed.`,
      boardId: payload.boardId,
    });

    this.server.in(payload.boardId).fetchSockets().then(sockets => {
      sockets.filter(s => s.data.userId === payload.targetUserId)
        .forEach(s => s.leave(payload.boardId));
    });
  }

  @EventPattern('board.access.requested')
  handleAccessRequested(payload: { boardId: string; requesterEmail?: string; requestedRole: BoardRole; }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'ACCESS_REQUESTED',
      message: `${payload.requesterEmail} requested ${payload.requestedRole} access.`,
      boardId: payload.boardId,
    });
  }

  @EventPattern('board.access.responded')
  handleAccessResponded(payload: { boardId: string; boardTitle: string; userId: string; status: 'approved' | 'denied'; role: string; }) {
    this.server.in(payload.boardId).fetchSockets().then(sockets => {
      sockets.filter(s => s.data.userId === payload.userId)
        .forEach(s => s.emit('personalNotification', {
          type: 'ACCESS_RESPONSE',
          status: payload.status,
          message: `Your request for ${payload.boardTitle} was ${payload.status}.`,
        }));
    });
  }

  @EventPattern('board.deleted')
  handleBoardDeleted(payload: { boardId: string; boardTitle: string; deletedBy: string }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'BOARD_DELETED',
      message: `Board "${payload.boardTitle}" has been deleted.`,
      boardId: payload.boardId,
    });
    this.server.in(payload.boardId).disconnectSockets(true);
  }

  @EventPattern('board.updated')
  handleBoardUpdated(payload: { boardId: string; boardTitle: string; updates: any }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'BOARD_UPDATED',
      message: `Board settings were updated.`,
      boardId: payload.boardId,
    });
  }

  @EventPattern('board.member.role.changed')
  handleRoleChanged(payload: { boardId: string; targetUserId: string; newRole: BoardRole }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'ROLE_CHANGED',
      memberId: payload.targetUserId,
      message: `A member's role was changed to ${payload.newRole}.`,
      boardId: payload.boardId,
    });
  }

  @EventPattern('board.ownership.transferred')
  handleOwnershipTransferred(payload: { boardId: string; oldOwnerId: string; newOwnerId: string }) {
    this.server.to(payload.boardId).emit('boardUpdate', {
      type: 'OWNERSHIP_TRANSFERRED',
      message: `Board ownership has been transferred.`,
      boardId: payload.boardId,
    });
  }
}