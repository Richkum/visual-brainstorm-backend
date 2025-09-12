import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseAuthConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger(MongooseAuthConfigService.name);

  createMongooseOptions(): MongooseModuleOptions {
    const uri = process.env.MONGO_AUTH_URL;
    if (!uri) {
      throw new Error('MONGO_AUTH_URL environment variable is not set');
    }

    const maskedUrl = this.maskMongoUrl(uri);
    this.logger.log(`Connecting to auth database: ${maskedUrl}`);

    return {
      uri: uri,
      connectionFactory: (connection: Connection) => {
        connection.on('connected', () => {
          this.logDatabaseStats(connection);
        });
        connection.on('error', (err) => {
          this.logger.error('❌ Auth MongoDB connection error:', err.message);
        });
        connection.on('disconnected', () => {
          this.logger.warn('⚠️ Auth MongoDB disconnected!');
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
          `Auth MongoDB server version: ${serverStatus.version}`,
        );
        this.logger.debug(`Auth Database name: ${dbInfo.db}`);
        this.logger.debug(`Auth Collections count: ${dbInfo.collections}`);
        this.logger.log('✅ Successfully connected to auth database');
      } else {
        this.logger.warn('Auth connection DB instance not available');
      }
    } catch (err) {
      this.logger.warn('Could not fetch auth database stats:', err.message);
    }
  }
}
