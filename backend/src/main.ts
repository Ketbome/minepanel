import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Generate one with: openssl rand -base64 32');
  }

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [process.env.FRONTEND_URL],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
      exposedHeaders: ['Authorization'],
    },
  });

  app.use(cookieParser());

  const basePath = (process.env.BASE_PATH || '').split('#')[0].trim();
  if (basePath) {
    app.setGlobalPrefix(basePath);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(process.env.PORT ?? 8091, '0.0.0.0');
}
bootstrap();
