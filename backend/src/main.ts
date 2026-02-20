import { NestFactory } from '@nestjs/core';
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

  const app = await NestFactory.create(AppModule);

  // Enable CORS with explicit configuration for development
  // Read allowed origins from environment variable or use defaults
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  // Allow all origins in development if CORS_ALLOW_ALL is set
  const allowAllOrigins = process.env.NODE_ENV === 'development' && process.env.CORS_ALLOW_ALL === 'true';

  app.enableCors({
    origin: allowAllOrigins ? true : corsOrigins,
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

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`CORS enabled for all origins`);
}
bootstrap();
