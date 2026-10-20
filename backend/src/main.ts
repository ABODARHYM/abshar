import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { buildValidationPipe } from './common/validation';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const { all: config } = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // خلف reverse proxy (HTTPS يُنهى عند Nginx/Load Balancer): نثق بأول proxy
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: config.http.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key', 'Accept-Language'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const doc = new DocumentBuilder()
      .setTitle('ABSHER BI API')
      .setDescription('REST API لمنصة أبشر بي. الأخطاء بصيغة { code, message, details, requestId }.')
      .setVersion('0.1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc), {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log('Swagger UI: /api/docs');
  }

  await app.listen(config.port, '0.0.0.0');
  logger.log(`ABSHER BI backend listening on :${config.port} | tier=${config.tier} | env=${config.env}`);
}

bootstrap().catch((error: Error) => {
  // eslint-disable-next-line no-console
  console.error(`Fatal startup error: ${error.message}`);
  process.exit(1);
});
