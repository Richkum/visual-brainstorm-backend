import { NestFactory } from '@nestjs/core';
import { CanvasServiceModule } from './canvas-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CanvasServiceModule);
  app.enableCors({
    origin: '*',
  });
  await app.listen(process.env.port ?? 3004);
}
bootstrap();
