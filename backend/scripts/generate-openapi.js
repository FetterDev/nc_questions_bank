const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

require('reflect-metadata');

const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const { AppModule } = require('../dist/src/app.module');

async function generateOpenApi() {
  process.env.PRISMA_SKIP_CONNECT = 'true';

  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Nord API')
    .setDescription('Backend API for interview questions bank')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = join(process.cwd(), 'openapi.json');

  writeFileSync(outPath, JSON.stringify(document, null, 2), 'utf-8');
  await app.close();

  process.stdout.write(`OpenAPI written to ${outPath}\n`);
  process.exit(0);
}

generateOpenApi().catch((error) => {
  console.error(error);
  process.exit(1);
});
