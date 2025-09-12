import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatMessage, ChatDocument } from './chat.schema';

export interface ChatData {
  roomId: string;
  messages: ChatMessage[];
  lastActivity: Date;
}

@Injectable()
export class ChatServiceService {
  constructor(
    @InjectModel('Chat') private chatModel: Model<ChatDocument>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getChatRoom(roomId: string): Promise<ChatRoom | null> {
    return this.chatModel.findOne({ roomId }).exec();
  }

  async getMessages(roomId: string): Promise<ChatMessage[]> {
    const chatRoom = await this.chatModel.findOne({ roomId }).exec();
    return chatRoom ? chatRoom.messages : [];
  }

  async sendMessage(roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const messageId = `${roomId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ChatMessage = {
      id: messageId,
      roomId,
      userId: message.userId,
      username: message.username,
      message: message.message,
      timestamp: new Date(),
      type: message.type || 'message',
    };

    let chatRoom = await this.chatModel.findOne({ roomId }).exec();
    if (!chatRoom) {
      chatRoom = new this.chatModel({
        roomId,
        name: 'Chat Room',
        creator: message.userId,
        messages: [],
        lastActivity: new Date(),
        participantCount: 1,
      });
    }

    chatRoom.messages.push(newMessage);
    chatRoom.lastActivity = new Date();
    await chatRoom.save();

    return newMessage;
  }

  async createChatRoom(roomId: string, name: string, creator: string): Promise<ChatRoom> {
    // Use findOneAndUpdate with upsert to handle concurrent requests safely
    const chatRoom = await this.chatModel.findOneAndUpdate(
      { roomId },
      {
        $setOnInsert: {
          roomId,
          name,
          creator,
          messages: [],
          lastActivity: new Date(),
          participantCount: 0,
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).exec();

    return chatRoom;
  }

  async listChatRooms(): Promise<ChatRoom[]> {
    return this.chatModel.find().exec();
  }

  async deleteChatRoom(roomId: string): Promise<void> {
    await this.chatModel.deleteOne({ roomId }).exec();
  }

  async clearChat(roomId: string): Promise<void> {
    await this.chatModel.updateOne(
      { roomId },
      { $set: { messages: [], lastActivity: new Date() } }
    ).exec();
  }

  async updateParticipantCount(roomId: string, count: number): Promise<void> {
    await this.chatModel.updateOne(
      { roomId },
      { $set: { participantCount: count, lastActivity: new Date() } }
    ).exec();
  }

  validateMessage(message: any): boolean {
    // Basic validation: check if message has required fields
    return !!(message &&
              typeof message === 'object' &&
              message.userId &&
              message.username &&
              message.message);
  }
}
