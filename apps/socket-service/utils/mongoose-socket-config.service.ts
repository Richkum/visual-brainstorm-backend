import { Injectable } from '@nestjs/common';
import { MongooseOptionsFactory, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MongooseSocketConfigService implements MongooseOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get('MONGO_CANVAS_URL');

    if (!uri) {
      throw new Error('MONGO_CANVAS_URL environment variable is not set');
    }

    return {
      uri,
    };
  }
}
