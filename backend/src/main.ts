import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Validate required environment variables
  const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    Logger.error(
      `❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these in your backend/.env file.\n` +
      `You can generate secure keys with: openssl rand -base64 32`
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS with explicit configuration for development
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: true,
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
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Serve customer360 static files (不需要认证)
  expressApp.use('/customer360', (req: any, res: any) => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'customer360', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(filePath);
    } else {
      res.status(404).send('Not Found');
    }
  });

  // Serve reports from frontend dist directory (不需要认证)
  // 优先从后端目录读取，没有则从前端dist目录读取
  expressApp.use('/reports', (req: any, res: any) => {
    const fs = require('fs');
    const path = require('path');

    // 先尝试后端目录
    let filePath = path.join(process.cwd(), 'customer360', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(filePath);
    }

    // 再尝试前端dist目录
    filePath = path.join(process.cwd(), '..', 'dist', 'reports', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(filePath);
    }

    res.status(404).send('Not Found');
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`CORS enabled for all origins`);
}
bootstrap();
