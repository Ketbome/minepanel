import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { normalizeBasePath } from './config';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Generate one with: openssl rand -base64 32');
  }
  // Compose reads `JWT_SECRET=   # comment` (older .env.example) as the comment text: a publicly known secret.
  if (process.env.JWT_SECRET.trimStart().startsWith('#')) {
    throw new Error(
      'JWT_SECRET holds an inline .env comment, not a secret. Put the comment on its own line and set a real value (openssl rand -base64 32). Every session ends and stored integration secrets must be re-entered.',
    );
  }
  if (process.env.JWT_SECRET.length < 32) {
    new Logger('Bootstrap').warn('JWT_SECRET is shorter than 32 characters. Generate a stronger one with: openssl rand -base64 32');
  }
  if (process.env.JWT_EXPIRES_IN) {
    new Logger('Bootstrap').warn(
      `JWT_EXPIRES_IN is deprecated and will be removed; the built-in 15m access token is kept alive by the refresh token. Unset it unless you have a reason (current: ${process.env.JWT_EXPIRES_IN}).`,
    );
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

  const basePath = normalizeBasePath(process.env.BASE_PATH);
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
