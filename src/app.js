import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}