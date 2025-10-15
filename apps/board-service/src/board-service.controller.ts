import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBoardDto } from './dto/create-board.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { BoardRole } from './board.schema';
import { BoardService } from './board-service.service';

@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) { }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createBoard(
    @Body() dto: CreateBoardDto,
    @Req() req: Request & { headers: any },
  ) {
    const userId = req.headers['x-user-id'] as string;
    const ownerEmail = req.headers['x-user-email'] as string;

    return this.boardService.createBoard(dto, userId, ownerEmail);
  }

  @Get()
  listBoards(@Req() req: Request & { headers: any }) {
    const userId = req.headers['x-user-id'] as string;
    return this.boardService.listBoardsForUser(userId);
  }

  @Get(':id')
  getBoard(@Param('id') id: string, @Req() req: Request & { headers: any }) {
    const userId = req.headers['x-user-id'] as string;
    // const ownerEmail = req.headers['x-user-email'] as string;
    return this.boardService.getBoardById(id, userId);
  }

  @Get('public/:id')
  getPublicBoardTitle(@Param('id') id: string) {
    return this.boardService.getPublicBoardInfo(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateBoard(
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
    @Req() req: Request & { headers: any },
  ) {
    const userId = req.headers['x-user-id'] as string;
    return this.boardService.updateBoard(id, userId, dto);
  }

  @Delete(':id')
  deleteBoard(@Param('id') id: string, @Req() req: Request & { headers: any }) {
    const userId = req.headers['x-user-id'] as string;
    return this.boardService.deleteBoard(id, userId);
  }

  @Post(':id/invite')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  invite(
    @Param('id') id: string,
    @Body() dto: InviteUserDto,
    @Req() req: Request & { headers: any },
  ) {
    const inviterId = req.headers['x-user-id'] as string;
    const inviterEmail = req.headers['x-user-email'] as string;
    const inviterUserName = req.headers['x-user-username'] as string;
    return this.boardService.inviteUser(
      id,
      inviterId,
      inviterEmail,
      inviterUserName,
      dto.email,
      dto.role,
    );
  }

  @Delete(':id/invites/:inviteId')
  cancelInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
    @Req() req: Request & { headers: any },
  ) {
    const userId = req.headers['x-user-id'] as string;
    return this.boardService.cancelInvite(id, userId, inviteId);
  }

  @Post(':id/accept')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  acceptInvite(
    @Param('id') id: string,
    @Body() dto: AcceptInviteDto,
    @Req() req: Request & { headers: any },
  ) {
    const userId = req.headers['x-user-id'] as string;
    return this.boardService.acceptInvite(id, userId, dto.token);
  }

  @Post(':id/remove')
  removeMember(
    @Param('id') id: string,
    @Body() body: { userId: string },
    @Req() req: Request & { headers: any },
  ) {
    const requesterId = req.headers['x-user-id'] as string;
    if (!body.userId) {
      throw new BadRequestException('Target user ID is required.');
    }
    return this.boardService.removeMember(id, requesterId, body.userId);
  }

  @Post(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body() body: { userId: string; role: BoardRole },
    @Req() req: Request & { headers: any },
  ) {
    const requesterId = req.headers['x-user-id'] as string;
    return this.boardService.changeMemberRole(
      id,
      requesterId,
      body.userId,
      body.role,
    );
  }

  @Post(':id/copy')
  copy(@Param('id') id: string, @Req() req: Request & { headers: any }) {
    const userId = req.headers['x-user-id'] as string;
    return this.boardService.copyBoard(id, userId);
  }

  @Post(':id/public-link')
  setPublicLink(
    @Param('id') id: string,
    @Body() body: { role?: BoardRole.VIEWER | BoardRole.COMMENTER | null },
    @Req() req: Request & { headers: any },
  ) {
    const ownerId = req.headers['x-user-id'] as string;
    const role = body.role ?? null;
    return this.boardService.setPublicLink(id, ownerId, role);
  }

  @Post(':id/request-access')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  requestAccess(
    @Param('id') id: string,
    @Body() body: {
      requestedRole: BoardRole.VIEWER | BoardRole.COMMENTER | BoardRole.EDITOR;
      message?: string;
      email: string;
    },
    @Req() req: Request & { headers: any },
  ) {
    const userId = req.headers['x-user-id'] as string;
    const requesterEmail = (req.headers['x-user-email'] as string) || body.email;
    if (!requesterEmail) {
      throw new BadRequestException('Requester email is required.');
    }
    return this.boardService.requestAccess(
      id,
      userId,
      requesterEmail,
      body.requestedRole,
      body.message,
    );
  }

  // ... (existing imports and methods)

  @Post(':id/access-requests/:requestId/approve')
  approveAccessRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() body: { userId: string; role: BoardRole },
    @Req() req: Request & { headers: any },
  ) {
    const ownerId = req.headers['x-user-id'] as string;
    return this.boardService.approveAccessRequest(
      id,
      ownerId,
      requestId,
      body.userId,
      body.role,
    );
  }

  @Post(':id/access-requests/:requestId/deny')
  denyAccessRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Req() req: Request & { headers: any },
  ) {
    const ownerId = req.headers['x-user-id'] as string;
    return this.boardService.denyAccessRequest(id, ownerId, requestId);
  }

  // 💥 NEW ENDPOINT: GET /boards/:id/membership
  // Used by the Realtime Gateway for security check during socket connection
  @Get(':id/membership')
  async checkMembership(
    @Param('id') id: string,
    @Req() req: Request & { headers: any },
  ) {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      throw new ForbiddenException('User ID header missing.');
    }

    try {
      const result = await this.boardService.getMembershipRole(id, userId);

      return { isMember: true, role: result.role };
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new NotFoundException('Board not found.');
      }
      if (e instanceof ForbiddenException) {
        // Return 403 with the reason (e.g., 'pending_request')
        throw new ForbiddenException(e.message, e.getResponse() as any);
      }
      // Catch all other errors as Forbidden
      throw new ForbiddenException('Access denied.');
    }
  }
}