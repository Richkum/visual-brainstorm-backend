import { NestFactory } from '@nestjs/core';
import { GatewayApiModule } from './gateway-api.module';
import { config } from 'dotenv';

config();

async function bootstrap() {
  const app = await NestFactory.create(GatewayApiModule);
  app.enableCors({
    origin: '*',

    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });


  await app.listen(3007);
}
bootstrap();
