import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseChatConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger(MongooseChatConfigService.name);

  createMongooseOptions(): MongooseModuleOptions {
    const uri = process.env.MONGO_CHAT_URL;
    if (!uri) {
      throw new Error('MONGO_CHAT_URL environment variable is not set');
    }

    const maskedUrl = this.maskMongoUrl(uri);
    this.logger.log(`Connecting to chat database: ${maskedUrl}`);

    return {
      uri: uri,
      connectionFactory: (connection: Connection) => {
        connection.on('connected', () => {
          this.logDatabaseStats(connection);
        });
        connection.on('error', (err) => {
          this.logger.error('❌ Chat MongoDB connection error:', err.message);
        });
        connection.on('disconnected', () => {
          this.logger.warn('⚠️ Chat MongoDB disconnected!');
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
          `Chat MongoDB server version: ${serverStatus.version}`,
        );
        this.logger.debug(`Chat Database name: ${dbInfo.db}`);
        this.logger.debug(`Chat Collections count: ${dbInfo.collections}`);
        this.logger.log('✅ Successfully connected to chat database');
      } else {
        this.logger.warn('Chat connection DB instance not available');
      }
    } catch (err) {
      this.logger.warn('Could not fetch chat database stats:', err.message);
    }
  }
}
