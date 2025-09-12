import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChatServiceService } from './chat-service.service';
import { JwtAuthGuard } from '../../auth-service/gaurd/jwt-auth.guard';
import { ChatMessage, ChatRoom } from './chat.schema';

@Controller('chat')
export class ChatServiceController {
  constructor(
    private readonly chatServiceService: ChatServiceService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async listChatRooms(): Promise<ChatRoom[]> {
    return this.chatServiceService.listChatRooms();
  }

  @Get(':roomId')
  async getMessages(@Param('roomId') roomId: string): Promise<ChatMessage[]> {
    return this.chatServiceService.getMessages(roomId);
  }

  @Get(':roomId/room')
  async getChatRoom(@Param('roomId') roomId: string): Promise<ChatRoom | null> {
    return this.chatServiceService.getChatRoom(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createChatRoom(@Req() req, @Body() body: { roomId: string; name: string }): Promise<ChatRoom | { error: string }> {
    try {
      const creator = req.user._id;
      return await this.chatServiceService.createChatRoom(body.roomId, body.name, creator);
    } catch (error) {
      return { error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/message')
  async sendMessage(@Req() req, @Param('roomId') roomId: string, @Body() body: { message: string; type?: string }): Promise<ChatMessage | { error: string }> {
    try {
      if (!this.chatServiceService.validateMessage(body)) {
        return { error: 'Invalid message data' };
      }

      const userId = req.user._id;
      const username = req.user.username || req.user.email || 'Anonymous';

      const savedMessage = await this.chatServiceService.sendMessage(roomId, {
        roomId,
        userId,
        username,
        message: body.message,
        type: (body.type as 'message' | 'system' | 'join' | 'leave') || 'message',
      });

      // Broadcast the message to all users in the room via socket service
      try {
        await firstValueFrom(
          this.httpService.post('http://localhost:3001/socket/emit/room', {
            roomId,
            event: 'chatMessage',
            data: savedMessage,
          }),
        );
      } catch (broadcastError) {
        console.warn('Failed to broadcast message, but message was saved:', broadcastError.message);
      }

      return savedMessage;
    } catch (error) {
      return { error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId')
  async deleteChatRoom(@Param('roomId') roomId: string) {
    await this.chatServiceService.deleteChatRoom(roomId);
    return { message: 'Chat room deleted' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId/clear')
  async clearChat(@Param('roomId') roomId: string) {
    await this.chatServiceService.clearChat(roomId);
    return { message: 'Chat cleared' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/participants')
  async updateParticipantCount(@Param('roomId') roomId: string, @Body() body: { count: number }) {
    await this.chatServiceService.updateParticipantCount(roomId, body.count);
    return { message: 'Participant count updated' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('emit/message')
  async emitMessage(@Req() req, @Body() body: { roomId: string; message: any; event?: string }) {
    // This endpoint is called by the gateway to broadcast messages via socket service
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:3001/socket/emit/room', {
          roomId: body.roomId,
          event: body.event || 'chatMessage',
          data: body.message,
        }),
      );
      return { message: 'Message broadcasted successfully', roomId: body.roomId };
    } catch (error) {
      console.error('Failed to broadcast message:', error.message);
      return { error: 'Failed to broadcast message', details: error.message };
    }
  }
}
