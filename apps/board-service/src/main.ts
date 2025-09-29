import { NestFactory } from '@nestjs/core';
import { BoardModule } from './board-service.module';
import { config } from 'dotenv';

config();

async function bootstrap() {
  const app = await NestFactory.create(BoardModule);

  const port = process.env.PORT ? Number(process.env.PORT) : 3002;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";

  app.enableCors({
    origin: frontendUrl,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email'], // Add 'X-User-Id' here
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(port);
  console.log(`Server running on port ${port}`);
}

bootstrap();
