import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ChatServiceModule } from './../src/chat-service.module';

// Set test environment variables
process.env.MONGO_CHAT_URL = 'mongodb://localhost:27017/chat_test';
process.env.MONGO_AUTH_URL = 'mongodb://localhost:27017/auth_test';

describe('ChatServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ChatServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
