import { Test, TestingModule } from '@nestjs/testing';
import { RealTimeController } from './real-time.controller';
import { RealTimeService } from './real-time.service';

describe('RealTimeController', () => {
  let realTimeController: RealTimeController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RealTimeController],
      providers: [RealTimeService],
    }).compile();

    realTimeController = app.get<RealTimeController>(RealTimeController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(realTimeController.getHello()).toBe('Hello World!');
    });
  });
});
