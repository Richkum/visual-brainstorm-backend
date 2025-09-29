import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../user.shcema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel('User', 'authConnection') private userModel: Model<UserDocument>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    console.log(
      '🔑 JWT_SECRET loaded:',
      jwtSecret ? `${jwtSecret.substring(0, 10)}...` : 'NOT FOUND',
    );
    console.log('🔑 JWT_SECRET length:', jwtSecret?.length || 0);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Make sure this is the actual secret, not undefined
    });
  }

  async validate(payload: any) {
    console.log('=== JWT VALIDATION DEBUG ===');
    console.log('Payload received:', JSON.stringify(payload, null, 2));
    console.log('Payload.sub (userId):', payload.sub);
    console.log('Current time:', new Date().toISOString());
    console.log(
      'Token expires:',
      payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : 'No expiration',
    );

    const user = await this.userModel.findById(payload.sub);
    console.log('User found:', user ? 'YES' : 'NO');
    console.log('User ID:', user?._id);
    console.log('==============================');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}