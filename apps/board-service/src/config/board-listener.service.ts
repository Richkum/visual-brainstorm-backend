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
    email?: string; // Target email for invite
    targetUserId?: string;
    role: BoardRole;
    invitedBy: string;
  }) {
    this.logger.debug(`[Invite] Payload received. Target Email: ${payload.email}, Inviter Email: ${payload.inviterEmail}`);

    // Check 1: Ensure the invite email is present before proceeding
    if (!payload.email) {
      this.logger.warn(`[Invite] Target email not found in payload for board ${payload.boardId}. Skipping email send.`);
      // Realtime notification can still proceed if targetUserId is known
    } else {
      const inviteUrl = `${process.env.FRONTEND_URL}/board/${payload.boardId}/accept?token=${payload.token}`;
      await this.mailService.sendInviteEmail(
        payload.email,
        payload.boardTitle,
        payload.inviterEmail,
        inviteUrl,
      );
      this.logger.log(`Invite email sent to ${payload.email} for board ${payload.boardId}.`);
    }

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
    ownerEmail?: string; // Target email for owner notification
    ownerId?: string;
  }) {
    this.logger.log(
      `Access requested by ${payload.userId} (${payload.requesterEmail}) for board ${payload.boardId} as ${payload.requestedRole}`,
    );

    this.logger.debug(`[Access Request] Payload received. Owner Email: ${payload.ownerEmail}, Requester Email: ${payload.requesterEmail}`);


    // Check 2: Ensure both emails are present to notify the owner
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
      this.logger.log(`Access request email sent to owner: ${payload.ownerEmail} for board ${payload.boardId}.`);
    } else {
      this.logger.warn(`[Access Request] Owner or Requester email missing (Owner: ${!!payload.ownerEmail}, Requester: ${!!payload.requesterEmail}). Skipping email send.`);
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

    this.logger.debug(`[Access Response] Payload received. Target Email: ${payload.email}`);


    // Notify user by email
    if (payload.email) {
      await this.mailService.sendAccessResponseEmail(
        payload.email,
        payload.boardTitle,
        payload.status,
        payload.role,
      );
      this.logger.log(`Access response email sent to ${payload.email}.`);
    } else {
      this.logger.warn(`[Access Response] Target email missing in payload for user ${payload.userId}. Skipping email send.`);
    }

    this.publish('board.management.updated', { boardId: payload.boardId });
    this.publish('board.access.responded', payload);
  }
}
