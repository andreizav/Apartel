import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:4200',
          'http://localhost:4000',
        ],
    credentials: true,
  });
  await app.listen(process.env.PORT || 4000);
  console.log(`NestJS Server running on port ${process.env.PORT || 4000}`);
}
bootstrap();
