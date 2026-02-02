import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:4000'],
    credentials: true
  });
  await app.listen(process.env.PORT || 4000);
  console.log(`NestJS Server running on port ${process.env.PORT || 4000}`);
}
bootstrap();
