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
      auth: 'http://localhost:2000',
      canvas: 'http://localhost:3004',
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
        `[${requestId}] Authorization header: ${req?.headers?.authorization ? 'Present' : 'Missing'}`,
      );
      this.logger.debug(`[${requestId}] Target URL: ${targetUrl}`);
      req._gateway_forward_logged = true;
    }

    // IMPROVED: Only prevent loop for internal validation calls
    // This should only trigger when the gateway itself is making an internal call to validate tokens
    const isInternalValidationCall =
      path === '/auth/validate' &&
      req?.headers?.['x-service-token'] === process.env.GATEWAY_SERVICE_TOKEN &&
      req?._isInternalCall === true;

    if (isInternalValidationCall) {
      this.logger.warn(
        `[${requestId}] Detected internal gateway->auth validation call, skipping proxy to avoid loop`,
      );
      return { success: true, loopPrevented: true };
    }

    if (targetUrl.startsWith(baseUrls.canvas) && req?.headers?.authorization) {
      try {
        this.logger.debug(
          `[${requestId}] Validating token for canvas request...`,
        );

        const internalReq = {
          headers: {
            authorization: req.headers.authorization,
            'x-service-token': process.env.GATEWAY_SERVICE_TOKEN,
          },
          _isInternalCall: true,
          _generatedRequestId: requestId,
        };

        const authResponse = await firstValueFrom(
          this.httpService.request({
            url: `${baseUrls.auth}/auth/validate`,
            method: 'GET',
            headers: internalReq.headers,
            validateStatus: () => true,
          }),
        );

        const data = authResponse.data;
        this.logger.debug(`[${requestId}] Auth validation response:`, {
          status: authResponse.status,
          hasUser: !!data?.user,
          loopPrevented: data?.loopPrevented,
        });

        if (authResponse.status === 200 && (data?.user || data?.success)) {
          if (data?.user) {
            const { id, username, email } = data.user;
            forwardHeaders['x-user-id'] = id;
            if (username) forwardHeaders['x-user-username'] = username;
            if (email) forwardHeaders['x-user-email'] = email;
            this.logger.debug(`[${requestId}] Token validated, user ID: ${id}`);
          }
          forwardHeaders['x-service-token'] = process.env.GATEWAY_SERVICE_TOKEN;
        } else {
          this.logger.error(`[${requestId}] Token validation failed:`, {
            status: authResponse.status,
            data,
          });
          throw new HttpException('Unauthorized', 401);
        }
      } catch (err: any) {
        this.logger.error(
          `[${requestId}] Error validating token with auth service:`,
          {
            message: err?.message,
            status: err?.response?.status,
            data: err?.response?.data,
          },
        );
        throw new HttpException('Authentication failed', 401);
      }
    }

    forwardHeaders['x-service-token'] = process.env.GATEWAY_SERVICE_TOKEN;

    this.logger.debug(
      `[${requestId}] Forwarding headers: ${JSON.stringify(forwardHeaders, null, 2)}`,
    );

    try {
      this.logger.debug(`[${requestId}] Forwarding request to: ${targetUrl}`);

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

      this.logger.debug(
        `[${requestId}] Service response status: ${response.status}`,
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`[${requestId}] Proxy error:`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
      throw new HttpException(
        error.response?.data || 'Service error',
        error.response?.status || 500,
      );
    }
  }
}
