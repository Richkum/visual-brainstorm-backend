import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class CanvasServiceAuthGuard implements CanActivate {
  private readonly logger = new Logger(CanvasServiceAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Get request ID for logging
    const requestId = request._generatedRequestId || 'unknown';

    this.logger.debug(
      `[${requestId}] CanvasServiceAuthGuard: Checking service authentication`,
    );

    const serviceToken = request.headers['x-service-token'];
    const expectedToken = process.env.GATEWAY_SERVICE_TOKEN;

    if (!serviceToken || serviceToken !== expectedToken) {
      this.logger.warn(
        `[${requestId}] CanvasServiceAuthGuard: Missing or invalid service token`,
      );
      throw new UnauthorizedException('Unauthorized service call');
    }

    // Extract user info from headers (set by gateway)
    const userId = request.headers['x-user-id'];
    const username = request.headers['x-user-username'];
    const email = request.headers['x-user-email'];

    if (!userId) {
      this.logger.warn(
        `[${requestId}] CanvasServiceAuthGuard: No user ID in headers`,
      );
      throw new UnauthorizedException('User not authenticated');
    }

    request.user = {
      id: userId,
      userId: userId,
      username: username || '',
      email: email || '',
    };

    this.logger.debug(
      `[${requestId}] CanvasServiceAuthGuard: Authentication successful for user ${userId}`,
    );
    return true;
  }
}
