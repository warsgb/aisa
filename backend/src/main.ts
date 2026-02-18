import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with explicit configuration for development
  app.enableCors({
    origin: ['http://69.5.7.242:5173', 'http://localhost:5173', 'http://172.31.0.2:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'Authorization'],
    maxAge: 3600,
    preflightContinue: true,
  });

  // Handle OPTIONS requests explicitly
  const httpAdapter = app.getHttpAdapter();
  const expressApp = httpAdapter.getInstance() as any;

  expressApp.use((req: any, res: any, next: any) => {
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    next();
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`CORS enabled for all origins`);
}
bootstrap();
