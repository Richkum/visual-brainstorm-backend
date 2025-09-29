import { Test, TestingModule } from '@nestjs/testing';
import { BoardService } from './board-service.service';
import { BoardController } from './board-service.controller';

describe('BoardController', () => {
  let boardController: BoardController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BoardController],
      providers: [BoardService],
    }).compile();

    boardController = app.get<BoardController>(BoardController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(boardController.getHello()).toBe('Hello World!');
    });
  });
});
