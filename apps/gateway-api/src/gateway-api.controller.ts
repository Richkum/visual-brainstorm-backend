import { Controller, All, Req, Res, Body, Headers } from '@nestjs/common';
import { GatewayApiService } from './gateway-api.service';
import { Request, Response } from 'express';

@Controller()
export class GatewayApiController {
  constructor(private readonly gatewayApiService: GatewayApiService) {}

  @All('*')
  async proxy(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const result = await this.gatewayApiService.forwardRequest(
      req.path,
      req.method,
      body,
      headers,
      req,
      res,
    );
    return res.json(result);
  }
}
