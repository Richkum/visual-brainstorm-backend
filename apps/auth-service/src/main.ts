import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { AuthServiceModule } from './auth-service.module';

config();

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  app.enableCors({
    origin: ['http://localhost:3009'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  await app.listen(process.env.port ?? 3008);
}
bootstrap();
