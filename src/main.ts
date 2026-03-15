import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL || '*' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('CLEAR ERP v4.2')
    .setDescription('Consolidated Logistics ERP for Advanced Resource Management — LSCM Ltd')
    .setVersion('4.2')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n  ≡LSCM≡ CLEAR ERP v4.2`);
  console.log(`  API:     http://localhost:${port}/api`);
  console.log(`  Swagger: http://localhost:${port}/api/docs\n`);
}
bootstrap();
