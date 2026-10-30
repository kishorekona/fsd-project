import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { User } from '../models.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/errors.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { issueToken } from '../utils/jwt.js';

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many authentication attempts. Try again later.' } });

authRouter.post('/register', authLimiter,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('password').isString().isLength({ min: 10, max: 72 }).withMessage('Password must be 10–72 characters.'),
  body('role').optional().isIn(['student', 'instructor']).withMessage('Choose a valid account type.'),
  validateRequest,
  asyncRoute(async (req, res) => {
    const { name, email, password } = req.body;
    const existing = await User.exists({ email });
    if (existing) throw new HttpError(409, 'An account with this email already exists.');
    const passwordHash = await bcrypt.hash(password, 12);
    const requestedRole = req.body.role || 'student';
    const user = await User.create({ name, email, passwordHash, role: 'student', requestedRole, isApproved: requestedRole === 'student' });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, instructorPending: requestedRole === 'instructor' }, token: issueToken(user) });
  })
);

authRouter.post('/login', authLimiter,
  body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('password').isString().isLength({ min: 1, max: 72 }).withMessage('Password is required.'),
  validateRequest,
  asyncRoute(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !user.isActive || !(await user.verifyPassword(req.body.password))) throw new HttpError(401, 'Email or password is incorrect.');
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, instructorPending: user.requestedRole === 'instructor' && !user.isApproved }, token: issueToken(user) });
  })
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

authRouter.post('/logout', requireAuth, (_req, res) => {
  res.json({ message: 'Signed out. Discard the bearer token on this device.' });
});