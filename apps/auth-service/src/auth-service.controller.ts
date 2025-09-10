// auth-service.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../gaurd/jwt-auth.guard';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @Get()
  getStatus(): string {
    return 'Auth Service is running!';
  }

  @Post('register')
  async register(
    @Body() userData: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authServiceService.register(userData, req);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() body: { email: string; code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authServiceService.verifyEmail(body.email, body.code, req, res);
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authServiceService.login(body.email, body.password, req, res);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authServiceService.refresh(req, res);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authServiceService.logout(req, res);
  }

  @Post('resend-code')
  async resendCode(@Body() body: { email: string }) {
    return this.authServiceService.resendVerificationCode(body.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    console.log('Cookies received:', req.cookies);
    console.log('Headers received:', req.headers);

    return {
      success: true,
      user: (req as any).user,
    };
  }
}