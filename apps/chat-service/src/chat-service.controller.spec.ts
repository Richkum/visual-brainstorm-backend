import { Test, TestingModule } from '@nestjs/testing';
import { ChatServiceController } from './chat-service.controller';
import { ChatServiceService } from './chat-service.service';
import { ChatServiceModule } from './chat-service.module';

describe('ChatServiceController', () => {
  let chatServiceController: ChatServiceController;
  let chatServiceService: ChatServiceService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ChatServiceModule],
    }).compile();

    chatServiceController = app.get<ChatServiceController>(ChatServiceController);
    chatServiceService = app.get<ChatServiceService>(ChatServiceService);
  });

  describe('root', () => {
    it('should return "Hello World!" from service', () => {
      expect(chatServiceService.getHello()).toBe('Hello World!');
    });
  });

  describe('Chat operations', () => {
    it('should validate message correctly', () => {
      const validMessage = { userId: 'user1', username: 'User1', message: 'Hello' };
      const invalidMessage = { userId: 'user1' };

      expect(chatServiceService.validateMessage(validMessage)).toBe(true);
      expect(chatServiceService.validateMessage(invalidMessage)).toBe(false);
    });

    it('should create chat room', async () => {
      const roomId = 'test-room';
      const name = 'Test Room';
      const creator = 'user1';

      const result = await chatServiceService.createChatRoom(roomId, name, creator);
      expect(result.roomId).toBe(roomId);
      expect(result.name).toBe(name);
      expect(result.creator).toBe(creator);
    });

    it('should get messages from empty room', async () => {
      const roomId = 'empty-room';
      const messages = await chatServiceService.getMessages(roomId);
      expect(messages).toEqual([]);
    });
  });
});
