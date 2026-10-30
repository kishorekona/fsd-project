import { validationResult } from 'express-validator';
import { HttpError } from '../utils/http.js';

export function validateRequest(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(new HttpError(400, result.array({ onlyFirstError: true }).map((item) => item.msg).join(' ')));
  }
  next();
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Route not found.'));
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === 11000) return res.status(409).json({ message: 'A record with these details already exists.' });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid resource identifier.' });
  if (error.name === 'ValidationError') return res.status(400).json({ message: 'The submitted data is invalid.' });
  if (error.name === 'MulterError') return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'The uploaded file is too large.' : 'The uploaded file could not be accepted.' });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'An unexpected server error occurred.' : error.message });
}