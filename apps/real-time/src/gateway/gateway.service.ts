import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

@Injectable()
export class GatewayService {
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  async validateToken(authHeader?: string): Promise<AuthUser> {
    if (!authHeader) throw new UnauthorizedException('Missing auth header');

    try {
      // Call your external Auth service (or your main Gateway for validation)
      const res = await axios.get<{ success: boolean; user: AuthUser }>(
        `${this.authServiceUrl}/auth/validate`,
        { headers: { Authorization: authHeader } },
      );

      if (!res.data.success || !res.data.user) {
        throw new UnauthorizedException('Invalid token');
      }
      return res.data.user;
    } catch (err) {
      // WsJwtGuard will catch this and throw a WsException
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}