import { Injectable } from '@nestjs/common';

@Injectable()
export class CanvasServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
