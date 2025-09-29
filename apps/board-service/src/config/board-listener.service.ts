import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from './mail.service';
import { BoardRole } from '../board.schema';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class BoardListenerService {
  private readonly logger = new Logger(BoardListenerService.name);

  constructor(
    private readonly mailService: MailService,
    @Inject('REALTIME_SERVICE') private readonly realtimeClient: ClientProxy,
  ) { }

  private publish(pattern: string, payload: any): void {
    // Helper to safely publish message and subscribe to the observable
    (this.realtimeClient.emit(pattern, payload) as Observable<any>).subscribe({
      error: (err) => this.logger.error(`Failed to publish ${pattern} to Redis:`, err),
    });
  }

  // 1. Board Created
  @OnEvent('board.created')
  async handleBoardCreated(payload: { boardId: string; boardTitle: string; ownerId: string }) {
    this.logger.log(`Board created: ${payload.boardId} (${payload.boardTitle}) by ${payload.ownerId}`);
    this.publish('board.created', payload);
  }

  // 2. Invite Created
  @OnEvent('board.invite.created')
  async handleInviteCreated(payload: {
    boardId: string;
    boardTitle: string;
    inviteId: string;
    inviterUserName: string;
    inviterEmail: string;
    token: string;
    email?: string;
    targetUserId?: string;
    role: BoardRole;
    invitedBy: string;
  }) {
    if (!payload.email) return; // direct userId invite, no email

    const inviteUrl = `${process.env.FRONTEND_URL}/board/${payload.boardId}/accept?token=${payload.token}`;
    await this.mailService.sendInviteEmail(
      payload.email,
      payload.boardTitle,
      payload.inviterEmail,
      inviteUrl,
    );

    this.logger.log(`Invite sent to ${payload.email} for board ${payload.boardId} (${payload.boardTitle}) by ${payload.inviterUserName}`);

    if (payload.targetUserId) {
      this.publish('board.invite.created', {
        boardId: payload.boardId,
        boardTitle: payload.boardTitle,
        targetUserId: payload.targetUserId, // Key for targeting the user-room
        token: payload.token
      });
    }
  }

  // 3. Access Requested
  @OnEvent('board.access.requested')
  async handleAccessRequested(payload: {
    boardId: string;
    boardTitle: string;
    requestId: string;
    userId: string;
    requesterEmail?: string;
    requestedRole: BoardRole;
    message?: string;
    ownerEmail?: string;
    ownerId?: string;
  }) {
    this.logger.log(
      `Access requested by ${payload.userId} (${payload.requesterEmail}) for board ${payload.boardId} (${payload.boardTitle}) as ${payload.requestedRole}`,
    );

    if (payload.ownerEmail && payload.requesterEmail) {
      const manageLink = `${process.env.FRONTEND_URL}/board/${payload.boardId}?action=manage-sharing`;

      await this.mailService.sendAccessRequestEmail(
        payload.ownerEmail,
        payload.boardTitle,
        payload.requesterEmail,
        payload.requestedRole,
        payload.message,
        manageLink // Pass the new link to the email service
      );
    }

    // notify board owner by WebSocket

    if (payload.ownerId) {
      this.publish('board.access.requested', {
        boardId: payload.boardId,
        boardTitle: payload.boardTitle,
        ownerId: payload.ownerId, // Key for targeting the owner's user-room
        requesterEmail: payload.requesterEmail,
        requestedRole: payload.requestedRole,
      });
    }
  }

  // 4. Member Added
  @OnEvent('board.member.added')
  async handleMemberAdded(payload: { boardId: string; boardTitle: string; userId: string; role: BoardRole }) {
    this.logger.log(`User ${payload.userId} joined board ${payload.boardId} (${payload.boardTitle}) as ${payload.role}`);
    this.publish('board.member.added', payload);
    this.publish('board.management.updated', { boardId: payload.boardId });
  }

  // 5. Access Responded
  @OnEvent('board.access.responded')
  async handleAccessResponded(payload: {
    boardId: string;
    boardTitle: string;
    userId: string;
    email?: string;
    status: 'approved' | 'denied';
    role: string;
  }) {
    this.logger.log(
      `Access request for board ${payload.boardId} (${payload.boardTitle}) responded: ${payload.userId} -> ${payload.status}`,
    );

    // Notify user by email
    if (payload.email) {
      await this.mailService.sendAccessResponseEmail(
        payload.email,
        payload.boardTitle,
        payload.status,
        payload.role,
      );
    }
    this.publish('board.management.updated', { boardId: payload.boardId });
    this.publish('board.access.responded', payload);
  }
}
