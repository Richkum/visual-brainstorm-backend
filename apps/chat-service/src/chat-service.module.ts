import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ChatServiceController } from './chat-service.controller';
import { ChatServiceService } from './chat-service.service';
import { ChatSchema } from './chat.schema';
import { MongooseChatConfigService } from '../utils/mongoose-chat-config.service';
import { MongooseAuthConfigService } from '../../auth-service/utils/mongoose-auth-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useClass: MongooseChatConfigService,
    }),
    MongooseModule.forRootAsync({
      useClass: MongooseAuthConfigService,
      connectionName: 'auth',
    }),
    MongooseModule.forFeature([{ name: 'Chat', schema: ChatSchema }]),
  ],
  controllers: [ChatServiceController],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
