import { Test, TestingModule } from '@nestjs/testing';
import { CanvasServiceController } from './canvas-service.controller';
import { CanvasServiceService } from './canvas-service.service';

describe('CanvasServiceController', () => {
  let canvasServiceController: CanvasServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CanvasServiceController],
      providers: [CanvasServiceService],
    }).compile();

    canvasServiceController = app.get<CanvasServiceController>(CanvasServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(canvasServiceController.getHello()).toBe('Hello World!');
    });
  });
});
