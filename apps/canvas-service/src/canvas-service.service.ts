import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Canvas, DrawData, CanvasDocument } from './canvas.schema';
import { nanoid } from 'nanoid';

export interface CanvasData {
  roomId: string;
  strokes: DrawData[];
  lastUpdated: Date;
}

@Injectable()
export class CanvasServiceService {
  constructor(
    @InjectModel('Canvas') private canvasModel: Model<CanvasDocument>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getCanvas(roomId: string): Promise<Canvas | null> {
    return this.canvasModel.findOne({ roomId }).exec();
  }

  async updateCanvas(roomId: string, drawData: DrawData): Promise<Canvas> {
    let canvas = await this.canvasModel.findOne({ roomId }).exec();
    if (!canvas) {
      canvas = new this.canvasModel({
        roomId,
        name: 'Untitled Board',
        creator: 'unknown',
        strokes: [],
        lastUpdated: new Date(),
      });
    }

    if (!drawData.id) drawData.id = nanoid(); // ensure unique id
    canvas.strokes.push(drawData);
    canvas.lastUpdated = new Date();
    return canvas.save();
  }

  async createBoard(
    roomId: string,
    name: string,
    creator: string,
  ): Promise<Canvas> {
    const existing = await this.canvasModel.findOne({ roomId }).exec();
    if (existing) {
      throw new Error('Board with this roomId already exists');
    }
    const newBoard = new this.canvasModel({
      roomId,
      name,
      creator,
      strokes: [],
      lastUpdated: new Date(),
    });
    return newBoard.save();
  }

  async listBoards(): Promise<Canvas[]> {
    return this.canvasModel.find().exec();
  }

  async deleteBoard(roomId: string): Promise<void> {
    await this.canvasModel.deleteOne({ roomId }).exec();
  }

  async clearCanvas(roomId: string): Promise<void> {
    await this.canvasModel.deleteOne({ roomId }).exec();
  }

  validateDrawData(drawData: DrawData): boolean {
    // Basic validation: check if drawData has required fields
    return !!(
      drawData &&
      typeof drawData === 'object' &&
      drawData.type &&
      drawData.id
    );
  }
}
