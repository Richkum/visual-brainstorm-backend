import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayApiService {
  getHello(): string {
    return 'Hello World!';
  }
}
