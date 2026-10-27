import express from 'express';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureBodyParsers } from './body-parsers';

describe('configureBodyParsers', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    const fakeNestApp = {
      use: app.use.bind(app),
    } as unknown as NestExpressApplication;

    configureBodyParsers(fakeNestApp);

    app.post('/dev-tools/grip/test', (req, res) => {
      res.status(200).json({ body: req.body });
    });

    app.post('/portal/test', (req, res) => {
      res.status(200).json({ body: req.body });
    });
  });

  it('allows payloads under 256 KiB on Grip routes', async () => {
    const payload = { test: 'hello world' };

    const res = await request(app)
      .post('/dev-tools/grip/test')
      .send(payload)
      .expect(200);

    expect(res.body.body).toEqual(payload);
  });

  it('rejects payloads exceeding 256 KiB on Grip routes with 413 Payload Too Large', async () => {
    const oversizedPayload = { data: 'a'.repeat(260 * 1024) };

    await request(app)
      .post('/dev-tools/grip/test')
      .send(oversizedPayload)
      .expect(413);
  });

  it('allows payloads over 256 KiB on ordinary portal routes', async () => {
    const largePayload = { data: 'b'.repeat(300 * 1024) };

    const res = await request(app)
      .post('/portal/test')
      .send(largePayload)
      .expect(200);

    expect(res.body.body.data.length).toBe(300 * 1024);
  });
});
