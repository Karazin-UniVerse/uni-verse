import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { configureBodyParsers } from './utils/body-parsers';
import { getCorsConfig } from './utils/cors.config';

const LOGGER = new Logger('Main');
const SWAGGER_CONFIG = new DocumentBuilder()
  .setTitle('UniHub API')
  .setDescription(
    'UniHub / UniVerse API documentation for Moodle integration and core services',
  )
  .setVersion('1.0')
  .addBearerAuth()
  .addCookieAuth('accessToken')
  .addCookieAuth('refreshToken')
  .build();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // First, so CORS preflights, parser errors and Swagger responses get the headers too.
  // Local dev serves Swagger over plain HTTP, which upgrade-insecure-requests would break.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: isProduction ? [] : null },
      },
    }),
  );
  configureBodyParsers(app);
  app.enableCors(getCorsConfig());

  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, SWAGGER_CONFIG);

    SwaggerModule.setup('api', app, document);
  }

  app.use(morgan(isProduction ? 'combined' : 'dev'));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3001;

  await app.listen(port);
  LOGGER.log(`Backend server running on http://localhost:${port}`);

  if (!isProduction) {
    LOGGER.log(
      `Swagger documentation available at http://localhost:${port}/api`,
    );
  }
}
void bootstrap();
