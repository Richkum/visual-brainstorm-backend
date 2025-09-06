import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CanvasServiceService, CanvasData } from './canvas-service.service';
import { JwtAuthGuard } from '../../auth-service/gaurd/jwt-auth.guard';

@Controller('canvas')
export class CanvasServiceController {
  constructor(private readonly canvasServiceService: CanvasServiceService) {}

  // @UseGuards(JwtAuthGuard)
  @Get()
  async listBoards(): Promise<import('./canvas.schema').Canvas[]> {
    return this.canvasServiceService.listBoards();
  }

  // @UseGuards(JwtAuthGuard)
  @Get(':roomId')
  async getCanvas(@Param('roomId') roomId: string): Promise<import('./canvas.schema').Canvas | null> {
    return this.canvasServiceService.getCanvas(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createBoard(@Req() req, @Body() body: { roomId: string; name: string }): Promise<import('./canvas.schema').Canvas | { error: string }> {
    try {
      const creator = req.user._id;
      return await this.canvasServiceService.createBoard(body.roomId, body.name, creator);
    } catch (error) {
      return { error: error.message };
    }
  }

  // @UseGuards(JwtAuthGuard)
  @Post(':roomId/draw')
  async updateCanvas(@Param('roomId') roomId: string, @Body() drawData: any): Promise<import('./canvas.schema').Canvas | { error: string }> {
    if (!this.canvasServiceService.validateDrawData(drawData)) {
      return { error: 'Invalid draw data' };
    }
    return this.canvasServiceService.updateCanvas(roomId, drawData as import('./canvas.schema').DrawData);
  }

  // @UseGuards(JwtAuthGuard)
  @Delete(':roomId')
  async deleteBoard(@Param('roomId') roomId: string) {
    await this.canvasServiceService.deleteBoard(roomId);
    return { message: 'Board deleted' };
  }

  // @UseGuards(JwtAuthGuard)
  @Delete(':roomId/clear')
  async clearCanvas(@Param('roomId') roomId: string) {
    await this.canvasServiceService.clearCanvas(roomId);
    return { message: 'Canvas cleared' };
  }
}
