import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CORS : autorise le frontend Angular (port 4200)
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ✅ Préfixe global : TOUTES les routes commenceront par /api/v1
  // Avec ce préfixe :
  //   AiController(@Controller('nlp'))      → /api/v1/nlp/analyze-with-context
  //   SsasController(@Controller('ssas'))   → /api/v1/ssas/connect
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📡 API base URL: http://localhost:${port}/api/v1`);
  console.log(`🤖 NLP endpoint: http://localhost:${port}/api/v1/nlp/analyze-with-context`);
  console.log(`📊 SSAS endpoint: http://localhost:${port}/api/v1/ssas/connect`);
}

bootstrap();