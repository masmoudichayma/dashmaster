import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ❌ AVANT : @Get('api/v1/health')
  // ✅ APRÈS :
  @Get('health')
  healthCheck() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      routes: {
        ssas: '/api/v1/ssas/*',
        nlp: '/api/v1/nlp/*',
      },
    };
  }
}