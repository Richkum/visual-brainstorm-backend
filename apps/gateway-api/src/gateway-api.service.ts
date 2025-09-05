import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayApiService {
  constructor(private readonly httpService: HttpService) {}

  async forwardRequest(
    path: string,
    method: string,
    body?: any,
    headers?: any,
    req?: any,
    res?: any,
  ) {
    const baseUrls = {
      auth: 'http://localhost:3006',
      canvas: 'http://localhost:3002',
      chat: 'http://localhost:3003',
    };

    let targetUrl = '';
    if (path.startsWith('/auth')) targetUrl = baseUrls.auth + path;
    else if (path.startsWith('/canvas')) targetUrl = baseUrls.canvas + path;
    else if (path.startsWith('/chat')) targetUrl = baseUrls.chat + path;
    else throw new HttpException('Unknown service', 400);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: targetUrl,
          method,
          data: body,
          headers: {
            ...headers,
            cookie: req?.headers?.cookie, // 🔑 forward incoming cookies
          },
          withCredentials: true, // 🔑 allow axios to handle cookies
          validateStatus: () => true, // let Nest handle errors
        }),
      );

      // 🔑 forward Set-Cookie headers back to client
      const setCookie = response.headers['set-cookie'];
      if (setCookie && res) {
        res.setHeader('set-cookie', setCookie);
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Service error',
        error.response?.status || 500,
      );
    }
  }
}
