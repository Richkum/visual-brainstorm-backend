import { Controller, Req, Res, All } from '@nestjs/common';
import { GatewayApiService } from './gateway-api.service';
import { Request, Response } from 'express';

@Controller()
export class GatewayApiController {
  constructor(private readonly gatewayService: GatewayApiService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const data = await this.gatewayService.forwardRequest(
      req.path,
      req.method,
      req.body,
      req.headers,
    );
    res.json(data);
  }
}
