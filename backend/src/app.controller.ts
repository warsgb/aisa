import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'AISA Backend API is running',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }

  @Get('debug-auth')
  debugAuth() {
    return {
      message: 'Auth debug endpoint',
      headers_hint: 'Send Authorization header with: Bearer <token>',
      timestamp: new Date().toISOString(),
    };
  }
}
