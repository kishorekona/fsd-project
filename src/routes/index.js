import { Router } from 'express';
import { authRouter } from './auth.js';
import { coursesRouter } from './courses.js';
import { learningRouter } from './learning.js';
import { adminRouter } from './admin.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/courses', coursesRouter);
apiRouter.use('/', learningRouter);
apiRouter.use('/admin', adminRouter);