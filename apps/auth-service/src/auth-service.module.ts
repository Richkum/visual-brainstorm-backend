import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { EmailService } from 'utils/email.service';
import { UserSchema } from '../user.shcema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../gaurd/jwt-auth.guard';
import { JwtStrategy } from '../gaurd/jwt.strategy';
import { MongooseAuthConfigService } from '../utils/mongoose-auth-config.service';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseAuthConfigService,
      connectionName: 'authConnection',
    }),

    MongooseModule.forFeature(
      [{ name: 'User', schema: UserSchema }],
      'authConnection'
    ),

    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService, EmailService, JwtAuthGuard, JwtStrategy],
})
export class AuthServiceModule { }