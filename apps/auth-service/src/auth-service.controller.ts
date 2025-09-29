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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthServiceController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly authServiceService: AuthServiceService) { }

  @Get()
  getStatus(): string {
    return 'Auth Service is running!';
  }

  @Post('register')
  async register(
    @Body() userData: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authServiceService.register(userData);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authServiceService.verifyEmail(body.email, body.code);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authServiceService.login(body.email, body.password);
  }

  @Post('logout')
  async logout() {
    return this.authServiceService.logout();
  }

  @Post('resend-code')
  async resendCode(@Body() body: ResendCodeDto) {
    return this.authServiceService.resendVerificationCode(body.email);
  }

  @Get('validate')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      user: req.user,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ResendCodeDto) {
    return this.authServiceService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authServiceService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }
}
