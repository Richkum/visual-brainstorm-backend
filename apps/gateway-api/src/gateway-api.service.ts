import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayApiService {
  constructor(private readonly httpService: HttpService) {}

  async forwardRequest(
    path: string,
    method: string,
    body?: any,
    headers?: any,
  ) {
    const baseUrls = {
      auth: 'http://localhost:3006',
      canvas: 'http://localhost:3002',
      chat: 'http://localhost:3003',
      socket: 'http://localhost:3005',
    };

    // detect target service by path
    let targetUrl = '';
    if (path.startsWith('/auth')) targetUrl = baseUrls.auth + path;
    else if (path.startsWith('/canvas')) targetUrl = baseUrls.canvas + path;
    else if (path.startsWith('/chat')) targetUrl = baseUrls.chat + path;
    else if (path.startsWith('/socket')) targetUrl = baseUrls.socket + path;
    else throw new HttpException('Unknown service', 400);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: targetUrl,
          method,
          data: body,
          headers,
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Service error',
        error.response?.status || 500,
      );
    }
  }

  // Socket service communication methods
  async emitToRoom(roomId: string, event: string, data: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:3005/socket/emit/room', {
          roomId,
          event,
          data,
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Failed to emit to room:', error.message);
      throw new HttpException('Socket service error', 500);
    }
  }

  async emitToUser(userId: string, event: string, data: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:3005/socket/emit/user', {
          userId,
          event,
          data,
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Failed to emit to user:', error.message);
      throw new HttpException('Socket service error', 500);
    }
  }

  async getActiveConnections() {
    try {
      const response = await firstValueFrom(
        this.httpService.get('http://localhost:3005/socket/connections'),
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get active connections:', error.message);
      throw new HttpException('Socket service error', 500);
    }
  }

  // Chat service real-time integration methods
  async broadcastChatMessage(roomId: string, message: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:3003/chat/emit/message', {
          roomId,
          message,
        }),
      );
      return response.data;
    } catch (error) {
      console.error('Failed to broadcast chat message:', error.message);
      throw new HttpException('Chat service error', 500);
    }
  }
}
