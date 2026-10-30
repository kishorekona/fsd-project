import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Course, Enrollment, Submission, User } from '../models.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/errors.js';
import { asyncRoute, HttpError } from '../utils/http.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, allowRoles('admin'));

adminRouter.get('/stats', asyncRoute(async (_req, res) => {
  const [users, students, instructors, courses, publishedCourses, enrollments, submissions] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'instructor' }),
    Course.countDocuments({ isArchived: false }), Course.countDocuments({ isPublished: true, isArchived: false }),
    Enrollment.countDocuments(), Submission.countDocuments()
  ]);
  res.json({ users, students, instructors, courses, publishedCourses, enrollments, submissions });
}));

adminRouter.get('/users', query('page').optional().isInt({ min: 1 }).toInt(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt(), validateRequest,
  asyncRoute(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 25;
    const [users, total] = await Promise.all([
      User.find().select('name email role isActive createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments()
    ]);
    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

adminRouter.patch('/users/:userId/status', param('userId').isMongoId(), body('isActive').isBoolean(), validateRequest,
  asyncRoute(async (req, res) => {
    if (req.params.userId === req.user._id.toString() && !req.body.isActive) throw new HttpError(400, 'You cannot deactivate your own account.');
    const user = await User.findByIdAndUpdate(req.params.userId, { isActive: req.body.isActive }, { new: true }).select('name email role isActive');
    if (!user) throw new HttpError(404, 'User not found.');
    res.json({ user });
  })
);

adminRouter.patch('/users/:userId/approve', param('userId').isMongoId(), body('approved').isBoolean(), validateRequest,
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (!user) throw new HttpError(404, 'User not found.');
    if (user.requestedRole !== 'instructor') throw new HttpError(400, 'Only instructor applications can be approved.');
    if (req.body.approved && !user.isActive) throw new HttpError(400, 'Reactivate the account before approving instructor access.');
    user.isApproved = req.body.approved;
    user.role = req.body.approved ? 'instructor' : 'student';
    await user.save();
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, isApproved: user.isApproved } });
  })
);

adminRouter.get('/courses', asyncRoute(async (_req, res) => {
  const courses = await Course.find().populate('instructor', 'name email').sort({ updatedAt: -1 }).lean();
  res.json({ courses });
}));

adminRouter.patch('/courses/:courseId/status', param('courseId').isMongoId(), body('isPublished').isBoolean(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findByIdAndUpdate(req.params.courseId, { isPublished: req.body.isPublished }, { new: true }).select('title isPublished isArchived');
    if (!course) throw new HttpError(404, 'Course not found.');
    res.json({ course });
  })
);

adminRouter.get('/enrollments', asyncRoute(async (_req, res) => {
  const enrollments = await Enrollment.find().populate('student', 'name email').populate('course', 'title').sort({ enrolledAt: -1 }).lean();
  res.json({ enrollments });
}));