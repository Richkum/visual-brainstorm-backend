import { NestFactory } from '@nestjs/core';
import { CanvasServiceModule } from './canvas-service.module';
import { config } from 'dotenv';
import * as path from 'path';

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Looking for .env at:', path.join(process.cwd(), '.env'));

config();

console.log(
  'After config() - GATEWAY_SERVICE_TOKEN:',
  process.env.GATEWAY_SERVICE_TOKEN ? 'LOADED' : 'NOT LOADED',
);
console.log(
  'Total env vars loaded:',
  Object.keys(process.env).filter((k) => !k.startsWith('npm_')).length,
);

async function bootstrap() {
  const app = await NestFactory.create(CanvasServiceModule);
  await app.listen(process.env.port ?? 3004);
}
bootstrap();
