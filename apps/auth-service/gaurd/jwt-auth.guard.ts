import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get request ID for logging
    const requestId = request._generatedRequestId || 'unknown';

    this.logger.debug(`[${requestId}] JwtAuthGuard: Checking authorization`);

    // Check for Authorization header
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(
        `[${requestId}] JwtAuthGuard: Missing or invalid authorization header`,
      );
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    this.logger.debug(
      `[${requestId}] JwtAuthGuard: Authorization header found`,
    );

    try {
      const result = await super.canActivate(context);
      this.logger.debug(
        `[${requestId}] JwtAuthGuard: Authentication successful`,
      );

      if (result instanceof Observable) {
        return firstValueFrom(result);
      } else if (result as boolean) {
        return result;
      }
      return result;
    } catch (error) {
      this.logger.error(
        `[${requestId}] JwtAuthGuard: Authentication failed:`,
        error.message,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error('JWT handleRequest error:', {
        error: err?.message,
        hasUser: !!user,
        info: info?.message,
      });
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.debug('JWT handleRequest success:', {
      userId: user.id,
      email: user.email,
    });

    return user;
  }
}
