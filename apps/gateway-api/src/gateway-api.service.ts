import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'crypto';

@Injectable()
export class GatewayApiService {
  private readonly logger = new Logger(GatewayApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async forwardRequest(
    path: string,
    method: string,
    body?: any,
    headers?: any,
    req?: any,
    res?: any,
  ) {
    const baseUrls = {
      auth: process.env.AUTH_URL || 'http://localhost:2000',
      canvas: process.env.CANVAS_URL || 'http://localhost:3004',
      chat: process.env.CHAT_URL || 'http://localhost:4002',
    };

    // Determine target service
    let targetUrl = '';
    if (path.startsWith('/auth')) targetUrl = baseUrls.auth + path;
    else if (path.startsWith('/canvas')) targetUrl = baseUrls.canvas + path;
    else if (path.startsWith('/chat')) targetUrl = baseUrls.chat + path;
    else throw new HttpException('Unknown service', 400);

    const forwardHeaders: any = { ...headers };

    // Assign or generate request ID
    const requestId =
      req?._generatedRequestId ||
      req?.headers?.['x-request-id'] ||
      randomBytes(8).toString('hex');
    if (req) req._generatedRequestId = requestId;

    // Log request
    if (req && !req._gateway_forward_logged) {
      this.logger.debug(
        `[${requestId}] Gateway.forwardRequest -> path=${path} method=${method}`,
      );
      this.logger.debug(
        `[${requestId}] Authorization header: ${req?.headers?.authorization}`,
      );
      req._gateway_forward_logged = true;
    }

    // Prevent internal gateway->auth loop
    if (
      path.startsWith('/auth') &&
      req?.headers?.['x-service-token'] === process.env.GATEWAY_SERVICE_TOKEN &&
      req?.headers?.authorization
    ) {
      this.logger.warn(
        `[${requestId}] Detected internal gateway->auth call, skipping proxy to avoid loop`,
      );
      return { success: true, loopPrevented: true };
    }

    // If calling canvas and client provided Authorization, validate via auth service
    if (targetUrl.startsWith(baseUrls.canvas) && req?.headers?.authorization) {
      try {
        const authResponse = await firstValueFrom(
          this.httpService.request({
            url: `${baseUrls.auth}/auth/validate`,
            method: 'GET',
            headers: {
              authorization: req.headers.authorization,
              'x-service-token': process.env.GATEWAY_SERVICE_TOKEN,
            },
            validateStatus: () => true,
          }),
        );
        const data = authResponse.data;

        if (data?.user || data?.loopPrevented) {
          if (data?.user) {
            const { id, username, email } = data.user;
            forwardHeaders['x-user-id'] = id;
            if (username) forwardHeaders['x-user-username'] = username;
            if (email) forwardHeaders['x-user-email'] = email;
          }
          forwardHeaders['x-service-token'] = process.env.GATEWAY_SERVICE_TOKEN;
        } else {
          throw new HttpException('Unauthorized', 401);
        }
      } catch (err: any) {
        this.logger.error(
          `[${requestId}] Error validating token with auth service: ${err?.message || err}`,
        );
        throw new HttpException('Authentication failed', 401);
      }
    }

    // Forward the request to target service
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: targetUrl,
          method,
          data: body,
          headers: forwardHeaders,
          withCredentials: true,
          validateStatus: () => true,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `[${requestId}] Proxy error: ${error.response?.status} ${error.response?.data || error.message}`,
      );
      throw new HttpException(
        error.response?.data || 'Service error',
        error.response?.status || 500,
      );
    }
  }
}
