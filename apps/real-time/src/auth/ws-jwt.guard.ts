import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import axios from 'axios';

// Define the AuthUser interface locally to avoid imports
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);
  // Using the GATEWAY port (4001, based on your implicit structure)
  private readonly AUTH_VALIDATE_URL = 'http://localhost:3001/auth/auth/validate';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const authToken = client.handshake.auth.token as string;

    if (!authToken) {
      this.logger.error('Missing token in socket handshake.', client.id);
      throw new WsException('Missing authorization token');
    }

    const authHeader = `Bearer ${authToken}`;

    try {
      // HTTP Call to API Gateway for token validation
      this.logger.debug(`Validating token for socket ID: ${client.id} against: ${this.AUTH_VALIDATE_URL}`);

      const res = await axios.get<{ success: boolean; user: AuthUser }>(
        this.AUTH_VALIDATE_URL,
        { headers: { Authorization: authHeader } },
      );

      if (!res.data.success || !res.data.user) {
        this.logger.warn(`Token validation failed for socket ID: ${client.id}. Response success=false.`);
        throw new WsException('Invalid token');
      }

      const user: AuthUser = res.data.user;

      client.data.user = user;
      client.data.userId = user.id;

      this.logger.log(`User Authenticated. Socket ID: ${client.id}, User ID: ${user.id}`);

      return true;
    } catch (e) {
      this.logger.error(`Token validation failed for socket ID: ${client.id}. Error: ${e.message}`);
      throw new WsException('Unauthorized or expired token');
    }
  }
}
