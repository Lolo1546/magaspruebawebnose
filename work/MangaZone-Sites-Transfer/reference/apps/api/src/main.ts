import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: false,
    }),
  );

  const configService = app.get(ConfigService);
  const corsAllowedOrigins = configService.get<string[]>(
    'http.corsAllowedOrigins',
  );
  const trustProxyHops = configService.get<number>('http.trustProxyHops');

  app.use(cookieParser());

  if (corsAllowedOrigins && corsAllowedOrigins.length > 0) {
    app.enableCors({
      origin: corsAllowedOrigins,
      credentials: true,
    });
  }

  app.set('trust proxy', trustProxyHops);

  const configuredPort = process.env.API_PORT;

  if (process.env.NODE_ENV === 'production' && !configuredPort) {
    throw new Error('API_PORT is required in production.');
  }

  const port = Number(configuredPort ?? 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be a valid port number.');
  }

  await app.listen(port);
}
void bootstrap();
