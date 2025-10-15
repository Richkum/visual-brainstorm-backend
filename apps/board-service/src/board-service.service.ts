import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { CreateBoardDto } from './dto/create-board.dto';
import {
  BoardDocument,
  BoardRole,
  InviteStatus,
  BoardInvite,
  BoardMember,
  AccessRequest,
  PublicLink,
  Board,
} from './board.schema';
import { ClientProxy } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BoardService {
  constructor(
    @InjectModel('Board', 'boardConnection')
    private readonly boardModel: Model<BoardDocument>,
    // @Inject('REALTIME_SERVICE') private readonly realtimeClient: ClientProxy,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  private ensureUserId(userId?: string): void {
    if (!userId) throw new ForbiddenException('Missing user id (x-user-id)');
  }

  private findMember(board: BoardDocument, userId: string): BoardMember | undefined {
    return board.members.find((m: BoardMember) => m.userId === userId);
  }

  private assertRoleAllowed(
    board: BoardDocument,
    userId: string,
    allowed: BoardRole[],
  ): void {
    if (board.ownerId === userId) return;
    const member = this.findMember(board, userId);
    if (!member) throw new ForbiddenException('Not a member');
    if (!allowed.includes(member.role))
      throw new ForbiddenException('Insufficient permissions');
  }

  async createBoard(dto: CreateBoardDto, ownerId: string, ownerEmail: string,): Promise<BoardDocument> {
    this.ensureUserId(ownerId);
    const slug = `${dto.title.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;
    const board = new this.boardModel({
      title: dto.title,
      slug,
      ownerId,
      ownerEmail,
      members: [
        {
          userId: ownerId,
          email: ownerEmail,
          role: BoardRole.OWNER,
          joinedAt: new Date(),
        },
      ],
    });
    const savedBoard = await board.save();
    this.eventEmitter.emit('board.created', {
      boardId: savedBoard._id.toString(),
      boardTitle: savedBoard.title,
      ownerId,
    });
    return savedBoard;
  }

  async listBoardsForUser(userId: string): Promise<BoardDocument[]> {
    this.ensureUserId(userId);
    return this.boardModel
      .find({
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      })
      .lean()
      .exec() as Promise<BoardDocument[]>;
  }

  async getBoardById(boardId: string, userId: string): Promise<BoardDocument> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId).lean();
    if (!board) throw new NotFoundException('Board not found');
    const member = this.findMember(board, userId);

    if (board.ownerId === userId || member) {
      const ownerMember = board.members.find(m => m.userId === board.ownerId);
      if (ownerMember) {
        ownerMember.email = board.ownerEmail;
      }
      return board as BoardDocument;
    }
    if (board.isPublic && board.publicLink) {
      // For a public board, we also wa1nt the owner email.
      const ownerMember = board.members.find(m => m.userId === board.ownerId);
      if (ownerMember) {
        ownerMember.email = board.ownerEmail;
      }
      return board as BoardDocument;
    }
    const pendingRequest = board.accessRequests.find(
      (req: AccessRequest) => req.userId === userId && req.status === 'pending',
    );

    if (!member && pendingRequest) {
      throw new ForbiddenException("Access Denied", { description: "pending_request" });
    }

    throw new ForbiddenException('Access denied');
  }

  async getMembershipRole(boardId: string, userId: string): Promise<{ role: BoardRole }> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId).lean();
    if (!board) throw new NotFoundException('Board not found');

    // 1. Check if Owner
    if (board.ownerId === userId) {
      return { role: BoardRole.OWNER };
    }

    const member = this.findMember(board, userId);

    // 2. Check if Member
    if (member) {
      return { role: member.role };
    }

    // 3. Check for Pending Access Request
    const pendingRequest = board.accessRequests.find(
      (req: AccessRequest) => req.userId === userId && req.status === 'pending',
    );
    if (pendingRequest) {
      // Return a specific error status code via the ForbiddenException response object
      throw new ForbiddenException("Access Denied", { description: "pending_request" });
    }

    // 4. Check for Public Access (lowest role)
    if (board.isPublic && board.publicLink && board.publicLink.role) {
      return { role: board.publicLink.role };
    }

    // Default: Deny access
    throw new ForbiddenException('Access denied: Not a member.');
  }

  async getPublicBoardInfo(boardId: string): Promise<{ title: string }> {
    const board = await this.boardModel.findById(boardId).select('title').lean();
    if (!board) throw new NotFoundException('Board not found');
    return { title: board.title };
  }

  async updateBoard(boardId: string, userId: string, updates: Partial<Board>): Promise<BoardDocument> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    this.assertRoleAllowed(board, userId, [BoardRole.EDITOR, BoardRole.OWNER]);
    if (updates.title) board.title = updates.title;
    if (typeof updates.isPublic === 'boolean') board.isPublic = updates.isPublic;
    const savedBoard = await board.save();
    this.eventEmitter.emit('board.updated', {
      boardId: savedBoard._id.toString(),
      boardTitle: savedBoard.title,
      updates,
    });
    return savedBoard;
  }

  async deleteBoard(boardId: string, userId: string): Promise<{ success: boolean }> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId)
      throw new ForbiddenException('Only owner can delete board');
    await this.boardModel.deleteOne({ _id: boardId });
    this.eventEmitter.emit('board.deleted', {
      boardId,
      boardTitle: board.title,
      deletedBy: userId,
    });
    return { success: true };
  }

  async inviteUser(
    boardId: string,
    inviterId: string,
    inviterEmail: string,
    inviterUserName: string,
    email: string,
    role: Exclude<BoardRole, BoardRole.OWNER> = BoardRole.VIEWER,
  ): Promise<BoardDocument> {
    this.ensureUserId(inviterId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== inviterId)
      throw new ForbiddenException('Only owner can invite');

    if (board.members.some((m) => m.email === email)) {
      throw new BadRequestException('User is already a member');
    }

    if (board.invites.some(i => i.email === email && i.status === InviteStatus.PENDING)) {
      throw new BadRequestException('An invitation has already been sent to this email.');
    }

    const newInvite: BoardInvite = {
      _id: new Types.ObjectId(),
      email,
      role,
      token: nanoid(32),
      status: InviteStatus.PENDING,
      invitedBy: inviterId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };
    board.invites.push(newInvite);
    const savedBoard = await board.save();

    // THE FIX: Emit the correct event name 'board.invite.created'
    this.eventEmitter.emit('board.invite.created', {
      boardId,
      boardTitle: savedBoard.title,
      inviteId: newInvite._id.toString(),
      inviterUserName,
      inviterEmail,
      token: newInvite.token,
      email: newInvite.email,
      role: newInvite.role,
      invitedBy: newInvite.invitedBy,
    });
    return savedBoard;
  }

  async cancelInvite(boardId: string, userId: string, inviteId: string): Promise<{ success: boolean }> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId)
      throw new ForbiddenException('Only owner can cancel invites');

    const inviteIndex = board.invites.findIndex(i => i._id?.toString() === inviteId);
    if (inviteIndex === -1) {
      throw new NotFoundException('Invite not found');
    }

    board.invites.splice(inviteIndex, 1);
    await board.save();
    return { success: true };
  }

  async acceptInvite(boardId: string, userId: string, token: string): Promise<BoardDocument> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');

    const invite = board.invites.find(
      (i) => i.token === token && i.status === InviteStatus.PENDING,
    );

    if (!invite) {
      throw new NotFoundException('Invite not found or already used');
    }

    if (invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await board.save();
      throw new BadRequestException('Invite expired');
    }

    if (this.findMember(board, userId)) {
      invite.status = InviteStatus.ACCEPTED;
      await board.save();
      throw new BadRequestException('You are already a member of this board');
    }

    const newMember: BoardMember = {
      userId,
      email: invite.email,
      role: invite.role,
      joinedAt: new Date(),
      invitedBy: invite.invitedBy,
    };
    board.members.push(newMember);

    invite.status = InviteStatus.ACCEPTED;
    await board.save();

    this.eventEmitter.emit('board.member.added', {
      boardId,
      boardTitle: board.title,
      userId,
      email: newMember.email,
      role: invite.role,
    });

    return board;
  }

  async removeMember(boardId: string, requesterId: string, targetUserId: string): Promise<BoardDocument> {
    this.ensureUserId(requesterId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== requesterId)
      throw new ForbiddenException('Only owner can remove members');
    if (board.ownerId === targetUserId)
      throw new BadRequestException('Cannot remove owner');

    board.members = board.members.filter((m: BoardMember) => m.userId !== targetUserId);
    await board.save();
    this.eventEmitter.emit('board.member.removed', {
      boardId,
      boardTitle: board.title,
      targetUserId,
      removedBy: requesterId,
    });
    return board;
  }

  async changeMemberRole(
    boardId: string,
    requesterId: string,
    targetUserId: string,
    newRole: BoardRole,
  ): Promise<BoardDocument> {
    this.ensureUserId(requesterId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== requesterId)
      throw new ForbiddenException('Only owner can change roles');

    if (newRole === BoardRole.OWNER) {
      if (requesterId === targetUserId) {
        throw new BadRequestException("You are already the owner.");
      }
      const newOwnerMember = this.findMember(board, targetUserId);
      if (!newOwnerMember) {
        throw new NotFoundException('Target user is not a member');
      }

      board.members = board.members.map((member: BoardMember) => {
        if (member.userId === requesterId) {
          member.role = BoardRole.EDITOR;
        }
        return member;
      });

      board.ownerId = targetUserId;
      newOwnerMember.role = BoardRole.OWNER;
      await board.save();

      this.eventEmitter.emit('board.ownership.transferred', {
        boardId,
        oldOwnerId: requesterId,
        newOwnerId: targetUserId,
      });
      return board;
    }

    const member = this.findMember(board, targetUserId);
    if (!member) throw new NotFoundException('Member not found');
    member.role = newRole;
    await board.save();

    this.eventEmitter.emit('board.member.role.changed', {
      boardId,
      targetUserId,
      newRole,
    });
    return board;
  }

  async copyBoard(boardId: string, userId: string): Promise<BoardDocument> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');

    const member = this.findMember(board, userId);
    if (
      board.ownerId !== userId &&
      (!member || member.role !== BoardRole.EDITOR)
    ) {
      throw new ForbiddenException('Only owner or editor can copy');
    }

    const newSlug = `${board.slug}-copy-${nanoid(6)}`;
    const copy = new this.boardModel({
      title: `${board.title} (Copy)`,
      slug: newSlug,
      ownerId: userId,
      members: [
        { userId, role: BoardRole.OWNER, joinedAt: new Date() },
      ],
      isPublic: false,
    });

    const savedCopy = await copy.save();
    this.eventEmitter.emit('board.copied', {
      sourceBoardId: boardId,
      newBoardId: savedCopy._id.toString(),
      copiedBy: userId,
    });
    return savedCopy;
  }

  async setPublicLink(
    boardId: string,
    ownerId: string,
    role: BoardRole.VIEWER | BoardRole.COMMENTER | null,
  ): Promise<BoardDocument> {
    this.ensureUserId(ownerId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== ownerId)
      throw new ForbiddenException('Only owner can modify public link');

    if (role === null) {
      board.publicLink = null;
      board.isPublic = false;
    } else {
      const token = nanoid(24);
      const publicLink: PublicLink = { token, role };
      board.publicLink = publicLink;
      board.isPublic = true;
    }
    const savedBoard = await board.save();
    this.eventEmitter.emit('board.publiclink.changed', {
      boardId,
      boardTitle: board.title,
      changedBy: ownerId,
    });
    return savedBoard;
  }

  async requestAccess(
    boardId: string,
    userId: string,
    requesterEmail: string,
    requestedRole: Exclude<BoardRole, BoardRole.OWNER>,
    message?: string,
  ): Promise<BoardDocument> {
    this.ensureUserId(userId);
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found');
    if (board.isPublic) {
      throw new BadRequestException('This board is public. No access request is needed.');
    }

    if (board.accessRequests.some(r => r.userId === userId && r.status === 'pending')) {
      throw new BadRequestException('An access request is already pending for this user.');
    }

    if (this.findMember(board, userId)) {
      throw new BadRequestException('User is already a member of this board.');
    }

    const accessRequest: AccessRequest = {
      _id: new Types.ObjectId(),
      userId,
      requesterEmail,
      requestedRole,
      message,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    board.accessRequests.push(accessRequest);
    const savedBoard = await board.save();

    this.eventEmitter.emit('board.access.requested', {
      boardId,
      boardTitle: savedBoard.title,
      requesterId: userId,
      requesterEmail,
      requestedRole,
    });
    return savedBoard;
  }

  // ... (existing imports and methods)

  async approveAccessRequest(
    boardId: string,
    ownerId: string,
    requestId: string,
    userId: string,
    role: BoardRole,
  ): Promise<BoardDocument> {
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found.');
    if (board.ownerId !== ownerId) throw new ForbiddenException('Only the board owner can approve access requests.');

    const request = board.accessRequests.find(r => r._id?.toString() === requestId);
    if (!request || request.status !== 'pending') {
      throw new BadRequestException('Access request not found or already handled.');
    }

    // Add user as a member and update the request status
    board.members.push({ userId, email: request.requesterEmail, role, joinedAt: new Date() });
    request.status = 'approved';
    request.updatedAt = new Date();

    const updatedBoard = await board.save();

    // Emit event for email notification
    this.eventEmitter.emit('board.access.responded', {
      boardId,
      boardTitle: updatedBoard.title,
      userId,
      email: request.requesterEmail,
      status: 'approved',
      role,
    });

    return updatedBoard;
  }

  async denyAccessRequest(
    boardId: string,
    ownerId: string,
    requestId: string,
  ): Promise<BoardDocument> {
    const board = await this.boardModel.findById(boardId);
    if (!board) throw new NotFoundException('Board not found.');
    if (board.ownerId !== ownerId) throw new ForbiddenException('Only the board owner can deny access requests.');

    const request = board.accessRequests.find(r => r._id?.toString() === requestId);
    if (!request || request.status !== 'pending') {
      throw new BadRequestException('Access request not found or already handled.');
    }

    // Update the request status
    request.status = 'denied';
    request.updatedAt = new Date();

    const updatedBoard = await board.save();

    // Emit event for email notification
    this.eventEmitter.emit('board.access.responded', {
      boardId,
      boardTitle: updatedBoard.title,
      userId: request.userId,
      email: request.requesterEmail,
      status: 'denied',
      role: request.requestedRole,
    });

    return updatedBoard;
  }

}