import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SocketDocument } from './socket.schema';

@Injectable()
export class SocketServiceService {
  constructor(
    @InjectModel('Socket') private socketModel: Model<SocketDocument>,
  ) {}

  async createSocketConnection(socketData: Partial<SocketDocument>): Promise<SocketDocument> {
    const socketConnection = new this.socketModel(socketData);
    return socketConnection.save();
  }

  async findSocketById(socketId: string): Promise<SocketDocument | null> {
    return this.socketModel.findOne({ socketId }).exec();
  }

  async updateSocketConnection(socketId: string, updateData: Partial<SocketDocument>): Promise<SocketDocument | null> {
    return this.socketModel.findOneAndUpdate({ socketId }, updateData, { new: true }).exec();
  }

  async removeSocketConnection(socketId: string): Promise<void> {
    await this.socketModel.findOneAndDelete({ socketId }).exec();
  }

  async getAllActiveConnections(): Promise<SocketDocument[]> {
    return this.socketModel.find({ isConnected: true }).exec();
  }

  async getConnectionsByUserId(userId: string): Promise<SocketDocument[]> {
    return this.socketModel.find({ userId, isConnected: true }).exec();
  }
}
