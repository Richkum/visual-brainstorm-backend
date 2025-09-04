import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { EmailService } from 'utils/email.service';
import { UserDocument } from '../user.shcema';

@Injectable()
export class AuthServiceService {
  private ACCESS_TOKEN_EXPIRES = '30d';
  private REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;

  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // --- helpers ---
  private generateAccessToken(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    };
    return this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });
  }

  private generateRefreshToken(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      t: 'refresh',
    };
    return this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });
  }

  private async hashToken(token: string) {
    return bcrypt.hash(token, 10);
  }

  public setRefreshCookie(res: Response, token: string) {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: this.REFRESH_TOKEN_EXPIRES_MS,
      path: '/',
    };
    res.cookie('refreshToken', token, cookieOptions);
  }

  public clearRefreshCookie(res: Response) {
    res.clearCookie('refreshToken', { path: '/' });
  }

  // find session index by comparing refresh token against hashed tokens (bcrypt.compare)
  private async findSessionIndexByRefreshToken(
    user: UserDocument,
    refreshToken: string,
  ) {
    for (let i = 0; i < user.sessions.length; i++) {
      const s = user.sessions[i];
      const match = await bcrypt.compare(refreshToken, s.refreshTokenHash);
      if (match) return i;
    }
    return -1;
  }

  // --- register ---
  async register(userData: any, req: Request) {
    const { username, email, password } = userData;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    const newUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      isVerified: false,
    });

    await newUser.save();

    // send verification email
    await this.emailService.sendVerificationEmail(
      email,
      verificationCode,
      username,
    );

    return {
      success: true,
      message:
        'Registration successful. Please check your email for verification code.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    };
  }

  // --- verify email (auto-login) ---
  async verifyEmail(email: string, code: string, req: Request, res: Response) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new BadRequestException('User not found');

    if (user.isVerified) {
      return { success: true, message: 'Already verified. Please login.' };
    }

    if (
      user.verificationCode !== code ||
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired code.');
    }

    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpires = null;

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const refreshHash = await this.hashToken(refreshToken);

    const session = {
      _id: new Types.ObjectId(),
      refreshTokenHash: refreshHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_MS),
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    };

    user.sessions.push(session as any);
    await user.save();

    this.setRefreshCookie(res, refreshToken);

    return {
      success: true,
      message: 'Email verified, you are now logged in.',
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    };
  }

  // --- login ---
  async login(email: string, password: string, req: Request, res: Response) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified)
      throw new UnauthorizedException(
        'Email not verified. Please verify your email first.',
      );

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const refreshHash = await this.hashToken(refreshToken);
    const session = {
      _id: new Types.ObjectId(),
      refreshTokenHash: refreshHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_MS),
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    };
    user.sessions.push(session as any);
    await user.save();

    this.setRefreshCookie(res, refreshToken);

    return { success: true, accessToken };
  }

  // --- refresh token endpoint ---
  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    let payload: any = null;
    try {
      payload = this.jwtService.verify(refreshToken, {
        ignoreExpiration: true,
      });
    } catch (err) {
      // token invalid
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const sessionIndex = await this.findSessionIndexByRefreshToken(
      user,
      refreshToken,
    );
    if (sessionIndex === -1)
      throw new UnauthorizedException('Refresh token not recognized');

    const session = user.sessions[sessionIndex];
    if (!session || session.expiresAt < new Date()) {
      user.sessions.splice(sessionIndex, 1);
      await user.save();
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token expired');
    }

    const newRefreshToken = this.generateRefreshToken(user);
    const newRefreshHash = await this.hashToken(newRefreshToken);
    user.sessions[sessionIndex].refreshTokenHash = newRefreshHash;
    user.sessions[sessionIndex].createdAt = new Date();
    user.sessions[sessionIndex].expiresAt = new Date(
      Date.now() + this.REFRESH_TOKEN_EXPIRES_MS,
    );
    await user.save();

    // new cookie
    this.setRefreshCookie(res, newRefreshToken);

    const newAccessToken = this.generateAccessToken(user);
    return { success: true, accessToken: newAccessToken };
  }

  // --- logout (removes current session) ---
  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      this.clearRefreshCookie(res);
      return { success: true };
    }

    let payload: any = null;
    try {
      payload = this.jwtService.verify(refreshToken, {
        ignoreExpiration: true,
      });
    } catch (err) {
      this.clearRefreshCookie(res);
      return { success: true };
    }

    const user = await this.userModel.findById(payload.sub);
    if (user) {
      const sessionIndex = await this.findSessionIndexByRefreshToken(
        user,
        refreshToken,
      );
      if (sessionIndex !== -1) {
        user.sessions.splice(sessionIndex, 1);
        await user.save();
      }
    }

    this.clearRefreshCookie(res);
    return { success: true };
  }

  // --- resend verification code ---
  async resendVerificationCode(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new BadRequestException('User not found');
    if (user.isVerified) throw new BadRequestException('User already verified');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await this.emailService.sendVerificationEmail(
      user.email,
      newCode,
      user.username,
    );

    return {
      success: true,
      message: 'New verification code sent to your email.',
    };
  }
}
