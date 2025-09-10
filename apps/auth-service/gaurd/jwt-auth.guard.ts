import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try to get token from cookies first
    let token: string | null = request.cookies?.['refreshToken'] || null;

    // Fallback to Authorization header
    const authHeader = request.headers['authorization'];
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    // Attach token so Passport-JWT can use it
    request.headers['authorization'] = `Bearer ${token}`;

    try {
      const result = await this.validateRequest(context);
      return result;
    } catch (error) {
      console.error('JWT Guard - Authentication failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async validateRequest(context: ExecutionContext): Promise<boolean> {
    const result = super.canActivate(context);

    if (result instanceof Observable) {
      return firstValueFrom(result);
    } else if (result instanceof Promise) {
      return result;
    }
    return result;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user;
  }
}