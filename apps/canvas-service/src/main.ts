import { NestFactory } from '@nestjs/core';
import { CanvasServiceModule } from './canvas-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CanvasServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
