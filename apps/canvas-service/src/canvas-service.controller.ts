import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  HttpStatus,
  Header
} from '@nestjs/common';
import { Buffer } from 'buffer';
import { Request, Response } from 'express'; // Import for @Req/@Res types
import { CanvasService } from './canvas-service.service';

@Controller('canvas')
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) { }

  /**
   * The boardId is extracted from the URL path via NestJS parameter decoration.
   *  from Gateway: http://localhost:4001/canvas/board-abc-123/state
   * The Canvas Service sees: http://localhost:3003/board-abc-123/state
   * The @Get(':boardId/state') correctly maps 'board-abc-123' to @Param('boardId').
   */
  @Get(':boardId/state')
  async getInitialState(@Param('boardId') boardId: string): Promise<string> {
    const state = await this.canvasService.getInitialState(boardId);
    return Buffer.from(state).toString('base64');
  }

  @Post(':boardId/update')
  async applyUpdate(
    @Param('boardId') boardId: string,
    @Body('update') updateBase64: string,
    @Res() res: Response
  ): Promise<any> {
    // ... implementation using boardId ...
    if (!updateBase64) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Update payload missing.' });
    }

    const updateBuffer = Buffer.from(updateBase64, 'base64');
    const success = await this.canvasService.applyUpdate(boardId, updateBuffer);

    if (success) {
      return res.status(HttpStatus.OK).json({ success: true });
    } else {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to apply update in Y.Doc.' });
    }
  }

  @Get(':boardId/download')
  @Header('Content-Type', 'application/json')
  async downloadData(
    @Param('boardId') boardId: string, // <-- Extracted boardId from URL
    @Req() req: Request & { headers: any },
    @Res() res: Response,
  ) {
    const userId = req.headers['x-user-id'] as string;
    const authToken = req.headers['authorization'] as string;

    // 1. Enforce Role-Based Access Control via Gateway call
    await this.canvasService.checkDownloadPermission(boardId, userId, authToken);

    // 2. Fetch data (simplified JSON export)
    const canvasData = await this.canvasService.getCanvasDataAsJson(boardId);

    const format = req.query['format'] || 'json';
    const filename = `canvas-export-${boardId}.${format}`;

    if (format === 'json') {
      res.header('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(JSON.stringify(canvasData, null, 2));
    }

    return res.status(HttpStatus.NOT_IMPLEMENTED).send({ message: `Export format ${format} not supported by the backend yet.` });
  }
}