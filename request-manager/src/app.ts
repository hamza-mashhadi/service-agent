import express from 'express';
import bodyParser from 'body-parser';
import requestRouter from './routes/request';

export function createApp() {
  const app = express();
  app.use(bodyParser.json({ limit: '1mb' }));

  app.use('/request', requestRouter);

  app.get('/health', (_, res) => res.json({ ok: true }));

  return app;
}
