import 'reflect-metadata'; import { config as loadEnv } from 'dotenv'; loadEnv({ path: '../../.env' });
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core'; import helmet from 'helmet'; import cookieParser = require('cookie-parser'); import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] }); const logger = new Logger('Bootstrap');
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true });
  app.use(helmet()); app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0'); logger.log(`API listening on ${await app.getUrl()}`);
}
bootstrap();
