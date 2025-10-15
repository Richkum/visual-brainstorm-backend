import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token;

    if (!token) {
      throw new WsException('Unauthorized: missing token');
    }

    // ✅ Gateway already validated token before forwarding
    // In production, use JWT.verify locally with shared secret/public key if needed
    const user = client.handshake.auth.user;
    if (!user || !user.id) {
      throw new WsException('Unauthorized: missing user context');
    }

    client.data.user = user;
    client.data.userId = user.id;

    this.logger.log(`Socket connected for user ${user.id}, socketId=${client.id}`);
    return true;
  }
}
