import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Course, Enrollment } from '../models.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/errors.js';
import { asyncRoute, HttpError } from '../utils/http.js';

export const coursesRouter = Router();
const courseFields = [
  body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Course title must be 3–160 characters.'),
  body('slug').trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Use a lowercase, hyphen-separated course slug.'),
  body('category').optional().trim().isLength({ max: 80 }),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all-levels']),
  body('learningObjectives').optional().isArray({ max: 30 }),
  body('prerequisites').optional().isArray({ max: 30 }),
  body('shortDescription').optional().isString().isLength({ max: 300 }),
  body('description').optional().isString().isLength({ max: 10000 }),
  body('thumbnail').optional().isURL({ protocols: ['https'], require_protocol: true }),
  body('estimatedDurationMinutes').optional().isInt({ min: 0, max: 100000 }).toInt()
];

coursesRouter.get('/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('q').optional().trim().isLength({ max: 100 }),
  query('category').optional().trim().isLength({ max: 80 }),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all-levels']),
  validateRequest,
  asyncRoute(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 12;
    const filter = { isPublished: true, isArchived: false };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.level) filter.level = req.query.level;
    if (req.query.q) filter.$text = { $search: req.query.q };
    const [courses, total] = await Promise.all([
      Course.find(filter).select('-modules.lessons.textContent -modules.lessons.videoUrl -modules.lessons.resources').populate('instructor', 'name profileImage').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Course.countDocuments(filter)
    ]);
    res.json({ courses, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  })
);

coursesRouter.get('/:courseId', param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.courseId, isPublished: true, isArchived: false }).select('-modules.lessons.textContent -modules.lessons.videoUrl -modules.lessons.resources').populate('instructor', 'name profileImage bio').lean();
    if (!course) throw new HttpError(404, 'Course not found.');
    res.json({ course });
  })
);

coursesRouter.post('/', requireAuth, allowRoles('instructor', 'admin'), courseFields, validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.create({ ...req.body, instructor: req.user._id, isPublished: false, isArchived: false });
    res.status(201).json({ course });
  })
);

coursesRouter.patch('/:courseId', requireAuth, allowRoles('instructor', 'admin'), param('courseId').isMongoId(),
  body('title').optional().trim().isLength({ min: 3, max: 160 }), body('slug').optional().trim().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body('shortDescription').optional().isString().isLength({ max: 300 }), body('description').optional().isString().isLength({ max: 10000 }),
  body('thumbnail').optional().isURL({ protocols: ['https'], require_protocol: true }),
  body('category').optional().trim().isLength({ max: 80 }), body('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all-levels']),
  body('learningObjectives').optional().isArray({ max: 30 }), body('prerequisites').optional().isArray({ max: 30 }),
  body('estimatedDurationMinutes').optional().isInt({ min: 0, max: 100000 }).toInt(), body('modules').optional().isArray({ max: 100 }), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.isArchived) throw new HttpError(404, 'Course not found.');
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Only this course instructor or an administrator can manage it.');
    const fields = ['title', 'slug', 'shortDescription', 'description', 'thumbnail', 'category', 'level', 'learningObjectives', 'prerequisites', 'estimatedDurationMinutes', 'modules'];
    for (const field of fields) if (req.body[field] !== undefined) course[field] = req.body[field];
    await course.save();
    res.json({ course });
  })
);

coursesRouter.patch('/:courseId/publish', requireAuth, allowRoles('instructor', 'admin'), param('courseId').isMongoId(), body('isPublished').isBoolean(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.isArchived) throw new HttpError(404, 'Course not found.');
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Only this course instructor or an administrator can manage it.');
    course.isPublished = req.body.isPublished;
    await course.save();
    res.json({ course });
  })
);

coursesRouter.delete('/:courseId', requireAuth, allowRoles('instructor', 'admin'), param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.isArchived) throw new HttpError(404, 'Course not found.');
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Only this course instructor or an administrator can manage it.');
    course.isArchived = true;
    course.isPublished = false;
    await course.save();
    res.json({ message: 'Course archived.' });
  })
);

coursesRouter.post('/:courseId/enroll', requireAuth, allowRoles('student'), param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.courseId, isPublished: true, isArchived: false });
    if (!course) throw new HttpError(404, 'Course not found.');
    const enrollment = await Enrollment.findOneAndUpdate(
      { course: course._id, student: req.user._id },
      { $setOnInsert: { course: course._id, student: req.user._id } },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json({ enrollment });
  })
);

coursesRouter.get('/:courseId/students', requireAuth, allowRoles('instructor', 'admin'), param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId).select('instructor');
    if (!course) throw new HttpError(404, 'Course not found.');
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new HttpError(403, 'Only this course instructor or an administrator can view learners.');
    const enrollments = await Enrollment.find({ course: course._id }).populate('student', 'name email profileImage').lean();
    res.json({ enrollments });
  })
);