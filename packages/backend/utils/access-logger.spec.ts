import express from 'express';
import request from 'supertest';
import { createAccessLogger } from './access-logger';

describe('HTTP access log', () => {
  it('keeps normal request logs without disclosing a calendar subscription token', async () => {
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
    await request(app).get('/timetable/groups').expect(200);

    const logs = write.mock.calls.map(([line]) => line).join('');

    expect(logs).toContain('/timetable/groups');
    expect(logs).not.toContain('test-subscription-token');
  });
});
