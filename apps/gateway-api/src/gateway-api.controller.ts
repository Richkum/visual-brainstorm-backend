import {
  All,
  Controller,
  Req,
  Res,
  Param,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService, GatewayServices } from './gateway-api.service';
import { Method } from 'axios';

@Controller(':service')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) { }

  @All('*')
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Param('service') service: string,
  ) {
    try {
      // 1. Validate JWT with AuthService
      const user = await this.gatewayService.validateToken(
        req.headers['authorization'],
      );

      // 2. Forward request to correct service
      const response = await this.gatewayService.forwardRequest({
        service: service as keyof GatewayServices,
        method: req.method as Method,
        path: req.path.replace(/^\/[^/]+\//, ''), // strip "/board/" prefix
        body: req.body,
        headers: {
          ...req.headers,
          'x-user-id': user.id,
          'x-user-email': user.email,
          'x-user-username': user.username
        },
      });

      res.status(response.status).send(response.data);
    } catch (err) {
      console.error('Gateway Error:', err.response?.data || err.message);
      throw new HttpException(
        err.response?.data || 'Gateway Error',
        err.response?.status || 500,
      );
    }
  }
}
