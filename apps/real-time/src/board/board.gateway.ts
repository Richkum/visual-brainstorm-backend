// src/realtime/board.gateway.ts

import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  WsException,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Injectable, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { EventPattern } from '@nestjs/microservices';
import axios from 'axios';
import { RealtimeService } from '../real-time.service';

type BoardRole = 'viewer' | 'commenter' | 'editor' | 'owner';

@Injectable()
@UseGuards(WsJwtGuard)
@WebSocketGateway(4000, {
  cors: { origin: '*' },
  namespace: 'board',
})
export class BoardGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  private readonly API_GATEWAY_URL = 'http://localhost:4001';

  constructor(
    private readonly realtimeService: RealtimeService,
  ) { }

  handleConnection(client: Socket) {
    const { userId } = client.data;
    if (!userId) {
      client.disconnect(true);
      return;
    }
  }

  // --- Client Command: Join a Board Room ---
  @SubscribeMessage('joinBoard')
  async handleJoinBoard(client: Socket, payload: { boardId: string }) {
    const { boardId } = payload;
    const { userId } = client.data;
    const authToken = client.handshake.auth.token as string;

    // HTTP call to API Gateway -> Board Service for membership
    try {
      const res = await axios.get<{
        message: string; isMember: boolean; role: BoardRole
      }>(
        // API Gateway path: /board/boards/:id/membership
        `${this.API_GATEWAY_URL}/board/boards/${boardId}/membership`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-user-id': userId,
          },
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (res.status !== 200 || !res.data.isMember) {
        const errorDetail = res.data?.message || 'Access Denied: Not a member.';
        throw new WsException(errorDetail);
      }

      const memberRole: BoardRole = res.data.role;
      client.data.role = memberRole;

      client.join(boardId);
      client.emit('boardJoined', { boardId, status: 'success', role: memberRole });

    } catch (e) {
      const errorMessage = e instanceof WsException ? e.message : 'Forbidden: Internal access check failed.';
      throw new WsException(errorMessage);
    }
  }

  // --- Yjs and Presence Handlers (Placeholder) ---
  @SubscribeMessage('yjsUpdate')
  handleYjsUpdate(client: Socket, payload: { boardId: string; update: Buffer }) {
    throw new WsException('Yjs is not yet implemented.');
  }

  @SubscribeMessage('presenceUpdate')
  handlePresenceUpdate(client: Socket, payload: { boardId: string; awareness: any }) {
    client.to(payload.boardId).emit('presenceUpdate', {
      userId: client.data.userId,
      awareness: payload.awareness,
    });
  }

  // --- Board Service Event Listeners (Relaying Updates) ---
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