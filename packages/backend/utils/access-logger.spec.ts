import express from 'express';
import request from 'supertest';
import { createAccessLogger } from './access-logger';

describe('HTTP access log', () => {
  it('redacts calendar subscription tokens across normal, double-slash, and encoded paths', async () => {
    const app = express();
    const write = jest.fn();

    app.use(createAccessLogger({ write }));
    app.get('/timetable/calendar/feed/:token', (_req, res) =>
      res.sendStatus(200),
    );
    app.get('/timetable/groups', (_req, res) => res.sendStatus(200));

    await request(app)
      .get('/Timetable/Calendar/Feed/test-subscription-token')
      .expect(200);
    await request(app)
      .get('//timetable/calendar/feed/double-slash-token')
      .expect(404);
    await request(app)
      .get('/timetable/calendar/feed%2Fencoded-token')
      .expect(404);
    await request(app).get('/timetable/groups').expect(200);

    const logs = write.mock.calls.map(([line]) => line).join('');

    expect(logs).toContain('/timetable/groups');
    expect(logs).toContain('/Timetable/Calendar/Feed/[REDACTED]');
    expect(logs).toContain('//timetable/calendar/feed/[REDACTED]');
    expect(logs).not.toContain('test-subscription-token');
    expect(logs).not.toContain('double-slash-token');
    expect(logs).not.toContain('encoded-token');
  });
});
