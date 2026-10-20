import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { buildValidationPipe } from '../src/common/validation';
import { DatabaseService } from '../src/database/database.service';

describe('Health endpoints (no real database)', () => {
  let app: INestApplication;
  let dbUp = true;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      APP_TIER: 'FREE',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/test',
      JWT_ACCESS_SECRET: 'a'.repeat(40),
      JWT_REFRESH_SECRET: 'b'.repeat(40),
    });
    // الاستيراد بعد ضبط البيئة لأن AppConfigService يقرأ process.env عند الإنشاء
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ ping: async () => dbUp })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns ok with tier and a request id header', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tier).toBe('FREE');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/v1/health/ready returns 200 when database is up', async () => {
    dbUp = true;
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ready', database: 'up' });
  });

  it('GET /api/v1/health/ready returns structured 503 when database is down', async () => {
    dbUp = false;
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
    expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.requestId).toBeDefined();
  });

  it('unknown route returns the unified error shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body).toHaveProperty('requestId');
  });

  it('accepts a safe incoming request id and rejects an unsafe one', async () => {
    const ok = await request(app.getHttpServer()).get('/api/v1/health').set('X-Request-Id', 'client-req-123456').expect(200);
    expect(ok.headers['x-request-id']).toBe('client-req-123456');
    const bad = await request(app.getHttpServer()).get('/api/v1/health').set('X-Request-Id', 'x y<script>').expect(200);
    expect(bad.headers['x-request-id']).not.toBe('x y<script>');
  });
});
