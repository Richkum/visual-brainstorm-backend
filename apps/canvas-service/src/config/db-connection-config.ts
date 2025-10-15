import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger(MongooseConfigService.name);

  constructor(private configService: ConfigService) { }

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>('MONGO_CANVAS_URL');
    this.logger.log('MONGO_CANVAS_URL from env:', process.env.MONGO_CANVAS_URL);

    if (!uri) {
      throw new Error('MONGO_CANVAS_URL environment variable is not set');
    }

    const maskedUrl = this.maskMongoUrl(uri);
    this.logger.log(`Connecting to canvas database: ${maskedUrl}`);

    return {
      uri: uri,
      connectionFactory: (connection: Connection) => {
        connection.on('connected', () => {
          this.logDatabaseStats(connection);
        });
        connection.on('error', (err) => {
          this.logger.error('❌ canvas MongoDB connection error:', err.message);
        });
        connection.on('disconnected', () => {
          this.logger.warn('⚠️ canvas MongoDB disconnected!');
        });
        return connection;
      },
      retryAttempts: 5,
      retryDelay: 3000,
    };
  }

  private maskMongoUrl(url: string): string {
    return url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  }

  private async logDatabaseStats(connection: Connection) {
    try {
      // Wait for connection to be fully established
      await new Promise((resolve) => connection.once('open', resolve));

      if (connection.db) {
        const adminDb = connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        const dbInfo = await connection.db.stats();

        this.logger.debug(
          `canvas MongoDB server version: ${serverStatus.version}`,
        );
        this.logger.debug(`canvas Database name: ${dbInfo.db}`);
        this.logger.debug(`canvas Collections count: ${dbInfo.collections}`);
        this.logger.log('✅ Successfully connected to canvas database');
      } else {
        this.logger.warn('canvas connection DB instance not available');
      }
    } catch (err) {
      this.logger.warn('Could not fetch canvas database stats:', err.message);
    }
  }
}
