import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Canvas, DrawData, CanvasDocument } from './canvas.schema';

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
    canvas.strokes.push(drawData);
    canvas.lastUpdated = new Date();
    return canvas.save();
  }

  async createBoard(roomId: string, name: string, creator: string): Promise<Canvas & { inviteLink: string }> {
    // Use findOneAndUpdate with upsert to handle concurrent requests safely
    const board = await this.canvasModel.findOneAndUpdate(
      { roomId },
      {
        $setOnInsert: {
          roomId,
          name,
          creator,
          strokes: [],
          lastUpdated: new Date(),
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).exec();

    // Generate invite link with boardId and userId
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?boardId=${board.roomId}&userId=${board.creator}`;

    return { ...board.toObject(), inviteLink };
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
    return !!(drawData && typeof drawData === 'object' && drawData.type && drawData.id);
  }
}
