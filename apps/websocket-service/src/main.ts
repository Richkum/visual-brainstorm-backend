import { NestFactory } from '@nestjs/core';
import { WebsocketServiceModule } from './websocket-service.module';

async function bootstrap() {
  const app = await NestFactory.create(WebsocketServiceModule);

  app.enableCors();
  await app.listen(process.env.port ?? 3005);
}
bootstrap();
