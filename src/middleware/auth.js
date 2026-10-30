import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import { asyncRoute, HttpError } from '../utils/http.js';

export const requireAuth = asyncRoute(async (req, _res, next) => {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Sign in to continue.');
  let payload;
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT secret is not configured.');
    payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'learnhub-api', audience: 'learnhub-client' });
  } catch {
    throw new HttpError(401, 'Your session is invalid or has expired.');
  }
  const user = await User.findById(payload.sub).select('_id name email role isActive');
  if (!user || !user.isActive) throw new HttpError(401, 'This account is unavailable.');
  req.user = user;
  next();
});

export function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to perform this action.'));
    next();
  };
}

