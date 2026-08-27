import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

const LOGGER = new Logger('Main');
const SWAGGER_CONFIG = new DocumentBuilder()
  .setTitle('UniHub API')
  .setDescription(
    'UniHub / UniVerse API documentation for Moodle integration and core services',
  )
  .setVersion('1.0')
  .addBearerAuth()
  .addCookieAuth('refreshToken')
  .build();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '50mb' });

  app.enableCors({
    origin: (
      _origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests from any origin or without origin (mobile/curl/local)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const document = SwaggerModule.createDocument(app, SWAGGER_CONFIG);
  SwaggerModule.setup('api', app, document);

  app.use(morgan('dev'));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  LOGGER.log(`Backend server running on http://localhost:${port}`);
  LOGGER.log(`Swagger documentation available at http://localhost:${port}/api`);
}
void bootstrap();
