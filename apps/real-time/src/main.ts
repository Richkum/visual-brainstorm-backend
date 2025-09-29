import { NestFactory } from '@nestjs/core';
import { RealTimeModule } from './real-time.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(RealTimeModule);
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";

  app.enableCors({
    origin: frontendUrl,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(5000);
}
bootstrap();
