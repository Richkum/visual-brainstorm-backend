import { Test, TestingModule } from '@nestjs/testing';
import { GatewayApiController } from './gateway-api.controller';
import { GatewayApiService } from './gateway-api.service';

describe('GatewayApiController', () => {
  let gatewayApiController: GatewayApiController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [GatewayApiController],
      providers: [GatewayApiService],
    }).compile();

    gatewayApiController = app.get<GatewayApiController>(GatewayApiController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(gatewayApiController.getHello()).toBe('Hello World!');
    });
  });
});
