import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errors.js';

const clientIndex = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const clientBuildDirectory = dirname(clientIndex);

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
  if (existsSync(clientIndex)) {
    app.use(express.static(clientBuildDirectory));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      res.sendFile(clientIndex, (error) => { if (error) next(error); });
    });
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}