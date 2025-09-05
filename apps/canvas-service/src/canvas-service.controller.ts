import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { CanvasServiceService, CanvasData } from './canvas-service.service';
import { JwtAuthGuard } from '../../auth-service/gaurd/jwt-auth.guard';

@Controller('canvas')
export class CanvasServiceController {
  constructor(private readonly canvasServiceService: CanvasServiceService) {}

  @Get()
  getHello(): string {
    return this.canvasServiceService.getHello();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':roomId')
  getCanvas(@Param('roomId') roomId: string): CanvasData | null {
    return this.canvasServiceService.getCanvas(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/draw')
  updateCanvas(@Param('roomId') roomId: string, @Body() drawData: any): CanvasData | { error: string } {
    if (!this.canvasServiceService.validateDrawData(drawData)) {
      return { error: 'Invalid draw data' };
    }
    return this.canvasServiceService.updateCanvas(roomId, drawData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId')
  clearCanvas(@Param('roomId') roomId: string) {
    this.canvasServiceService.clearCanvas(roomId);
    return { message: 'Canvas cleared' };
  }
}
