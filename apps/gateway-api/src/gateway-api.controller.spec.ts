import { Test, TestingModule } from '@nestjs/testing';
import { GatewayController } from './gateway-api.controller';
import { GatewayService } from './gateway-api.service';

describe('GatewayApiController', () => {
  let gatewayApiController: GatewayController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [GatewayService],
    }).compile();

    gatewayApiController = app.get<GatewayController>(GatewayController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(gatewayApiController.getHello()).toBe('Hello World!');
    });
  });
});
