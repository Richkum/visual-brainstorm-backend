import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosResponse, Method } from 'axios';

export interface ForwardRequestOptions {
  service: keyof GatewayServices;
  method: Method;
  path: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

export type GatewayServices = {
  auth: string;
  board: string;
  realtime: string;
  canvas: string;
};
@Injectable()
export class GatewayService {
  private readonly services: GatewayServices = {
    auth: 'http://localhost:3001',
    board: 'http://localhost:3002',
    canvas: 'http://localhost:3003',
    realtime: 'http://localhost:5000',
  };

  async validateToken(authHeader?: string): Promise<AuthUser> {
    console.log("Welcome to ")
    if (!authHeader) throw new UnauthorizedException('Missing auth header');

    try {
      console.log(`${this.services['auth']}/auth/validate`,)
      const res = await axios.get<{ success: boolean; user: AuthUser }>(
        `${this.services['auth']}/auth/validate`,
        { headers: { Authorization: authHeader } },
      );

      if (!res.data.success || !res.data.user) {
        throw new UnauthorizedException('Invalid token');
      }

      return res.data.user;
    } catch (err) {
      console.error('Token validation failed:', err?.response?.data || err.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }


  async forwardRequest<T = unknown>({
    service,
    method,
    path,
    body,
    headers = {},
  }: ForwardRequestOptions): Promise<AxiosResponse<T>> {
    const baseUrl = this.services[service];
    if (!baseUrl) throw new Error(`Unknown service: ${service}`);

    const url = `${baseUrl}/${path}`;

    return axios.request<T>({
      url,
      method,
      headers,
      data: body,
      validateStatus: () => true, // always forward response
    });
  }
}
