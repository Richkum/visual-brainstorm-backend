import { NestFactory } from '@nestjs/core';
import { SocketServiceModule } from './socket-service.module';

async function bootstrap() {
  const app = await NestFactory.create(SocketServiceModule);

  // Enable CORS for socket connections
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(3005);
  console.log('Socket service is running on port 3005');
}
bootstrap();
