import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { initializePgVector } from './config/database-init';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Initialize pgvector extension
  try {
    const dataSource = app.get(DataSource);
    await initializePgVector(dataSource);
  } catch (error) {
    console.error('Failed to initialize pgvector:', error);
    // Continue anyway - the extension might already exist
  }
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
