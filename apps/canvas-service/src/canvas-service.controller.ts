import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { CanvasServiceService, CanvasData } from './canvas-service.service';
import { CanvasServiceAuthGuard } from '../utils/canvas-service-auth.guard';
import { User, AuthenticatedUser } from '../utils/user.decorator';

@Controller('canvas')
export class CanvasServiceController {
  private readonly logger = new Logger(CanvasServiceController.name);

  constructor(private readonly canvasServiceService: CanvasServiceService) {}

  @UseGuards(CanvasServiceAuthGuard)
  @Get()
  async listBoards(
    @User() user: AuthenticatedUser,
  ): Promise<import('./canvas.schema').Canvas[]> {
    this.logger.debug(`User ${user.id} (${user.email}) requesting board list`);
    return this.canvasServiceService.listBoards();
  }

  @UseGuards(CanvasServiceAuthGuard)
  @Get(':roomId')
  async getCanvas(
    @Param('roomId') roomId: string,
    @User() user: AuthenticatedUser,
  ): Promise<import('./canvas.schema').Canvas | null> {
    this.logger.debug(`User ${user.id} requesting canvas for room ${roomId}`);
    return this.canvasServiceService.getCanvas(roomId);
  }

  @UseGuards(CanvasServiceAuthGuard)
  @Post('create')
  async createBoard(
    @Body() body: { roomId: string; name: string },
    @User() user: AuthenticatedUser,
  ): Promise<import('./canvas.schema').Canvas | { error: string }> {
    try {
      this.logger.debug(
        `User ${user.id} (${user.username}) creating board: ${body.name}`,
      );

      // Use the authenticated user's info as the creator
      return await this.canvasServiceService.createBoard(
        body.roomId,
        body.name,
        user.username || user.email || user.id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create board for user ${user.id}:`,
        error.message,
      );
      return { error: error.message };
    }
  }

  @UseGuards(CanvasServiceAuthGuard)
  @Post(':roomId/draw')
  async updateCanvas(
    @Param('roomId') roomId: string,
    @Body() drawData: any,
    @User() user: AuthenticatedUser,
  ): Promise<import('./canvas.schema').Canvas | { error: string }> {
    this.logger.debug(`User ${user.id} drawing on canvas ${roomId}`);

    if (!this.canvasServiceService.validateDrawData(drawData)) {
      return { error: 'Invalid draw data' };
    }
    return this.canvasServiceService.updateCanvas(
      roomId,
      drawData as import('./canvas.schema').DrawData,
    );
  }

  @UseGuards(CanvasServiceAuthGuard)
  @Delete(':roomId')
  async deleteBoard(
    @Param('roomId') roomId: string,
    @User() user: AuthenticatedUser,
  ) {
    this.logger.debug(`User ${user.id} deleting board ${roomId}`);
    await this.canvasServiceService.deleteBoard(roomId);
    return { message: 'Board deleted' };
  }

  @UseGuards(CanvasServiceAuthGuard)
  @Delete(':roomId/clear')
  async clearCanvas(
    @Param('roomId') roomId: string,
    @User() user: AuthenticatedUser,
  ) {
    this.logger.debug(`User ${user.id} clearing canvas ${roomId}`);
    await this.canvasServiceService.clearCanvas(roomId);
    return { message: 'Canvas cleared' };
  }
}
