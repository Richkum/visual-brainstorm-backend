import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CanvasServiceController } from './canvas-service.controller';
import { CanvasServiceService } from './canvas-service.service';
import { CanvasSchema } from './canvas.schema';
import { MongooseCanvasConfigService } from '../utils/mongoose-canvas-config.service';
import { MongooseAuthConfigService } from '../../auth-service/utils/mongoose-auth-config.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../../auth-service/gaurd/jwt.strategy';
import { UserSchema } from '../../auth-service/user.shcema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useClass: MongooseCanvasConfigService,
    }),
    MongooseModule.forRootAsync({
      useClass: MongooseAuthConfigService,
      connectionName: 'auth',
    }),
    MongooseModule.forFeature([{ name: 'Canvas', schema: CanvasSchema }]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }], 'auth'),
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
  controllers: [CanvasServiceController],
  providers: [CanvasServiceService, JwtStrategy],
})
export class CanvasServiceModule {}
