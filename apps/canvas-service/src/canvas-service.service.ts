import { Injectable } from '@nestjs/common';

export interface CanvasData {
  roomId: string;
  strokes: any[];
  lastUpdated: Date;
}

@Injectable()
export class CanvasServiceService {
  private canvases: Map<string, CanvasData> = new Map();

  getHello(): string {
    return 'Hello World!';
  }

  getCanvas(roomId: string): CanvasData | null {
    return this.canvases.get(roomId) || null;
  }

  updateCanvas(roomId: string, drawData: any): CanvasData {
    let canvas = this.canvases.get(roomId);
    if (!canvas) {
      canvas = {
        roomId,
        strokes: [],
        lastUpdated: new Date(),
      };
    }
    canvas.strokes.push(drawData);
    canvas.lastUpdated = new Date();
    this.canvases.set(roomId, canvas);
    return canvas;
  }

  clearCanvas(roomId: string): void {
    this.canvases.delete(roomId);
  }

  validateDrawData(drawData: any): boolean {
    // Basic validation: check if drawData has required fields
    return drawData && typeof drawData === 'object' && drawData.type;
  }
}
