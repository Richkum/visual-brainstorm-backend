import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'utils/email.service';
import { UserDocument } from '../user.shcema';

@Injectable()
export class AuthServiceService {
  private ACCESS_TOKEN_EXPIRES = '30d';

  constructor(
    @InjectModel('User', 'authConnection') private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) { }

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

  // --- register ---
  async register(userData: any) {
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
  async verifyEmail(email: string, code: string) {
    console.log(`Verifying email for: ${email} with code: ${code}`);
    const user = await this.userModel.findOne({ email });
    if (!user) {
      console.log(`Verification failed: User not found for email: ${email}`);
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      console.log(
        `Verification failed: User already verified for email: ${email}`,
      );
      return { success: true, message: 'Already verified. Please login.' };
    }

    if (user.verificationCode !== code) {
      console.log(
        `Verification failed: Invalid code. Provided: ${code}, Stored: ${user.verificationCode}`,
      );
      throw new BadRequestException('Invalid code.');
    }

    if (
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < new Date()
    ) {
      console.log(`Verification failed: Code expired for email: ${email}`);
      throw new BadRequestException('Invalid or expired code.');
    }

    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpires = null;
    await user.save();

    console.log(
      `Email verified successfully for: ${email}. Proceeding with login.`,
    );
    const accessToken = this.generateAccessToken(user);

    return {
      success: true,
      message: 'Email verified, you are now logged in.',
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    };
  }

  // --- login ---
  async login(email: string, password: string) {
    console.log(`Login attempt for email: ${email}`);

    const user = await this.userModel.findOne({ email });
    if (!user) {
      console.log(`Login failed: User not found for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      console.log(`Login failed: User not verified for email: ${email}`);
      throw new UnauthorizedException(
        'Email not verified. Please verify your email first.',
      );
    }

    console.log(`User found and verified: ${email}`);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`Login failed: Invalid password for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log(`Password validated successfully for email: ${email}`);

    const accessToken = this.generateAccessToken(user);
    console.log(
      `Access token generated for user ${email}: ${accessToken.substring(0, 20)}...`,
    ); // Log first 20 chars for security

    const response = {
      success: true,
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    };

    console.log(
      `Login successful. Sending response to frontend for user: ${email}`,
    );
    console.log(`Response contains token: ${!!response.accessToken}`);
    console.log(`Token length: ${response.accessToken.length} characters`);

    return response;
  }

  // --- logout ---
  async logout() {
    return { success: true, message: 'Logged out successfully.' };
  }

  // --- resend verification code ---
  async resendVerificationCode(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new BadRequestException('User not found');
    if (user.isVerified) throw new BadRequestException('User already verified');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);
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

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      // For security reasons, don't reveal whether the email exists
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset code.',
      };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.verificationCode = resetCode;
    user.verificationCodeExpires = resetCodeExpires;

    await user.save();

    const emailResult = await this.emailService.sendPasswordResetEmail(
      email,
      resetCode,
      user.username,
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
    }

    return {
      success: true,
      message:
        'If your email is registered, you will receive a password reset code.',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Invalid email or reset code');
    }

    if (
      user.verificationCode !== code ||
      !user.verificationCodeExpires ||
      (user.verificationCodeExpires &&
        user.verificationCodeExpires < new Date())
    ) {
      const isExpired =
        user.verificationCodeExpires &&
        user.verificationCodeExpires < new Date();

      throw new BadRequestException(
        isExpired
          ? 'Reset code has expired. Please request a new one.'
          : 'Invalid reset code.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.verificationCode = '';
    user.verificationCodeExpires = null;

    await user.save();

    return {
      success: true,
      message:
        'Password has been reset successfully. You can now login with your new password.',
    };
  }
}