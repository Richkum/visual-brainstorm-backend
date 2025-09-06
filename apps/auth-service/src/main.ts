import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { AuthServiceModule } from './auth-service.module';

config();

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  await app.listen(process.env.port ?? 2000);
}
bootstrap();
