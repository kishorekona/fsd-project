import { Router } from 'express';
import { body, param } from 'express-validator';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { Assignment, Course, Enrollment, Quiz, QuizAttempt, Submission } from '../models.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { assignmentUpload, uploadDirectory } from '../middleware/uploads.js';
import { validateRequest } from '../middleware/errors.js';
import { asyncRoute, HttpError } from '../utils/http.js';

export const learningRouter = Router();

async function courseForInstructor(courseId, user) {
  const course = await Course.findById(courseId).select('instructor isArchived');
  if (!course || course.isArchived) throw new HttpError(404, 'Course not found.');
  if (course.instructor.toString() !== user._id.toString() && user.role !== 'admin') throw new HttpError(403, 'You do not manage this course.');
  return course;
}

async function verifyEnrollment(courseId, userId) {
  const enrollment = await Enrollment.findOne({ course: courseId, student: userId, status: 'active' });
  if (!enrollment) throw new HttpError(403, 'Enroll in this course to access its learning materials.');
  return enrollment;
}

learningRouter.get('/enrollments/me', requireAuth, allowRoles('student'), asyncRoute(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id, status: 'active' }).populate({
    path: 'course', select: 'title slug shortDescription thumbnail category level modules instructor', populate: { path: 'instructor', select: 'name' }
  }).select('-course.modules.lessons.textContent -course.modules.lessons.videoUrl -course.modules.lessons.resources').lean();
  res.json({ enrollments });
}));

learningRouter.get('/assignments/me', requireAuth, allowRoles('student'), asyncRoute(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id, status: 'active' }).select('course');
  const assignments = await Assignment.find({ course: { $in: enrollments.map((item) => item.course) }, dueDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    .populate('course', 'title').sort({ dueDate: 1 }).lean();
  const submitted = await Submission.find({ student: req.user._id, assignment: { $in: assignments.map((item) => item._id) } }).distinct('assignment');
  res.json({ assignments: assignments.filter((item) => !submitted.some((id) => id.toString() === item._id.toString())) });
}));

learningRouter.get('/courses/:courseId/lessons', requireAuth, param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId).select('instructor isPublished isArchived modules');
    if (!course || course.isArchived) throw new HttpError(404, 'Course not found.');
    const instructor = course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin';
    if (!instructor && course.isPublished) await verifyEnrollment(course._id, req.user._id);
    if (!instructor && !course.isPublished) throw new HttpError(404, 'Course not found.');
    res.json({ modules: course.modules.map((module) => ({
      ...module.toObject(), lessons: module.lessons.map((lesson) => ({
        ...lesson.toObject(), ...(instructor ? {} : { textContent: lesson.isPreview ? lesson.textContent : '' })
      }))
    })) });
  })
);

learningRouter.get('/courses/:courseId/learning', requireAuth, param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId).populate('instructor', 'name').lean();
    if (!course || course.isArchived || !course.isPublished) throw new HttpError(404, 'Course not found.');
    const instructor = course.instructor._id.toString() === req.user._id.toString() || req.user.role === 'admin';
    if (!instructor) await verifyEnrollment(course._id, req.user._id);
    res.json({ course });
  })
);

learningRouter.get('/lessons/:lessonId', requireAuth, param('lessonId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findOne({ 'modules.lessons._id': req.params.lessonId }).select('instructor isPublished isArchived modules');
    if (!course || course.isArchived) throw new HttpError(404, 'Lesson not found.');
    const instructor = course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin';
    const lesson = course.modules.flatMap((module) => module.lessons).find((item) => item._id.toString() === req.params.lessonId);
    if (!instructor && (!course.isPublished || (!lesson.isPreview && !await Enrollment.exists({ course: course._id, student: req.user._id, status: 'active' })))) {
      throw new HttpError(403, 'Enroll in this course to access this lesson.');
    }
    const lessonData = lesson.toObject();
    if (!instructor && !lesson.isPreview) lessonData.isPreview = false;
    res.json({ lesson: lessonData });
  })
);

learningRouter.patch('/lessons/:lessonId/complete', requireAuth, allowRoles('student'),
  param('lessonId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findOne({ 'modules.lessons._id': req.params.lessonId, isPublished: true, isArchived: false }).select('modules');
    if (!course) throw new HttpError(404, 'Lesson not found.');
    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson._id.toString()));
    const enrollment = await verifyEnrollment(course._id, req.user._id);
    enrollment.completedLessons.addToSet(req.params.lessonId);
    enrollment.completionPercentage = lessonIds.length ? Math.round(enrollment.completedLessons.length / lessonIds.length * 100) : 0;
    if (enrollment.completionPercentage === 100) enrollment.status = 'completed';
    await enrollment.save();
    res.json({ enrollment });
  })
);

learningRouter.post('/courses/:courseId/quizzes', requireAuth, allowRoles('instructor', 'admin'),
  param('courseId').isMongoId(), body('title').trim().isLength({ min: 2, max: 160 }),
  body('questions').isArray({ min: 1, max: 100 }),
  body('questions.*.prompt').trim().isLength({ min: 1, max: 2000 }),
  body('questions.*.options').isArray({ min: 2, max: 8 }),
  body('questions.*.options.*').isString().trim().isLength({ min: 1, max: 500 }),
  body('questions.*.correctOption').isInt({ min: 0 }),
  body('passingScore').optional().isInt({ min: 0, max: 100 }),
  body('attemptLimit').optional().isInt({ min: 1, max: 20 }), validateRequest,
  asyncRoute(async (req, res) => {
    await courseForInstructor(req.params.courseId, req.user);
    const quiz = await Quiz.create({ ...req.body, course: req.params.courseId });
    res.status(201).json({ quiz: { id: quiz._id, title: quiz.title, isPublished: quiz.isPublished } });
  })
);

learningRouter.get('/courses/:courseId/quizzes', requireAuth, param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId).select('instructor isPublished isArchived');
    if (!course || course.isArchived) throw new HttpError(404, 'Course not found.');
    const instructor = course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin';
    if (!instructor) {
      if (!course.isPublished) throw new HttpError(404, 'Course not found.');
      await verifyEnrollment(course._id, req.user._id);
    }
    const quizzes = await Quiz.find({ course: course._id, ...(instructor ? {} : { isPublished: true }) })
      .select('title instructions passingScore timeLimitMinutes attemptLimit isPublished questions.prompt questions.options').sort({ createdAt: 1 }).lean();
    res.json({ quizzes });
  })
);

learningRouter.get('/quizzes/:quizId', requireAuth, param('quizId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, isPublished: true }).select('-questions.correctOption -questions.explanation').lean();
    if (!quiz) throw new HttpError(404, 'Quiz not found.');
    await verifyEnrollment(quiz.course, req.user._id);
    res.json({ quiz });
  })
);

learningRouter.post('/quizzes/:quizId/attempts', requireAuth, allowRoles('student'),
  param('quizId').isMongoId(), body('answers').isArray({ max: 100 }),
  body('answers.*').isInt({ min: 0, max: 100 }), validateRequest,
  asyncRoute(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, isPublished: true });
    if (!quiz) throw new HttpError(404, 'Quiz not found.');
    await verifyEnrollment(quiz.course, req.user._id);
    const attempts = await QuizAttempt.countDocuments({ quiz: quiz._id, student: req.user._id });
    if (attempts >= quiz.attemptLimit) throw new HttpError(403, 'You have reached the attempt limit for this quiz.');
    if (req.body.answers.length !== quiz.questions.length) throw new HttpError(400, 'Submit one answer for each quiz question.');
    const correct = quiz.questions.reduce((total, question, index) => total + (req.body.answers[index] === question.correctOption ? 1 : 0), 0);
    const score = Math.round(correct / quiz.questions.length * 100);
    const attempt = await QuizAttempt.create({ quiz: quiz._id, student: req.user._id, submittedAnswers: req.body.answers, score, passed: score >= quiz.passingScore });
    res.status(201).json({ attempt: { id: attempt._id, score, passed: attempt.passed, submittedAt: attempt.submittedAt }, correct, total: quiz.questions.length, attemptsRemaining: Math.max(0, quiz.attemptLimit - attempts - 1) });
  })
);

learningRouter.get('/quizzes/:quizId/attempts/me', requireAuth, allowRoles('student'), param('quizId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    if (!await Quiz.exists({ _id: req.params.quizId })) throw new HttpError(404, 'Quiz not found.');
    const attempts = await QuizAttempt.find({ quiz: req.params.quizId, student: req.user._id }).select('score passed startedAt submittedAt').sort({ submittedAt: -1 }).lean();
    res.json({ attempts });
  })
);

learningRouter.post('/courses/:courseId/assignments', requireAuth, allowRoles('instructor', 'admin'),
  param('courseId').isMongoId(), body('title').trim().isLength({ min: 2, max: 160 }),
  body('instructions').trim().isLength({ min: 1, max: 10000 }), body('dueDate').isISO8601(),
  body('maximumScore').optional().isInt({ min: 1, max: 100000 }),
  body('maximumFileSize').optional().isInt({ min: 1, max: 52428800 }),
  body('allowedFileTypes').optional().isArray({ max: 20 }),
  body('allowLateSubmissions').optional().isBoolean(), validateRequest,
  asyncRoute(async (req, res) => {
    await courseForInstructor(req.params.courseId, req.user);
    const assignment = await Assignment.create({ ...req.body, course: req.params.courseId });
    res.status(201).json({ assignment });
  })
);

learningRouter.get('/courses/:courseId/assignments', requireAuth, param('courseId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const course = await Course.findById(req.params.courseId).select('instructor');
    if (!course) throw new HttpError(404, 'Course not found.');
    const canManage = req.user.role === 'admin' || course.instructor.toString() === req.user._id.toString();
    if (!canManage) await verifyEnrollment(course._id, req.user._id);
    const assignments = await Assignment.find({ course: course._id }).sort({ dueDate: 1 }).lean();
    res.json({ assignments });
  })
);

learningRouter.post('/assignments/:assignmentId/submissions', requireAuth, allowRoles('student'),
  param('assignmentId').isMongoId(), body('textResponse').optional().isString().isLength({ max: 20000 }),
  (req, res, next) => assignmentUpload.single('file')(req, res, (error) => error ? next(new HttpError(400, error.message)) : next()),
  asyncRoute(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) throw new HttpError(404, 'Assignment not found.');
    await verifyEnrollment(assignment.course, req.user._id);
    if (new Date() > assignment.dueDate && !assignment.allowLateSubmissions) throw new HttpError(400, 'The deadline has passed and late submissions are disabled.');
    if (!req.file && !req.body.textResponse?.trim()) throw new HttpError(400, 'Add a written response or an allowed file.');
    if (req.file && assignment.allowedFileTypes.length && !assignment.allowedFileTypes.map((extension) => extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`).includes(path.extname(req.file.originalname).toLowerCase())) {
      throw new HttpError(400, 'This file extension is not allowed for the assignment.');
    }
    const previousSubmission = await Submission.findOne({ assignment: assignment._id, student: req.user._id });
    if (previousSubmission?.fileReference?.url && req.file) {
      const oldFile = path.join(uploadDirectory, path.basename(previousSubmission.fileReference.url));
      await unlink(oldFile).catch(() => {});
    }
    const submission = await Submission.findOneAndUpdate(
      { assignment: assignment._id, student: req.user._id },
      { $set: {
        textResponse: req.body.textResponse || '',
        ...(req.file ? { fileReference: { title: path.basename(req.file.originalname), url: req.file.filename, mimeType: req.file.mimetype } } : {}),
        submittedAt: new Date(), status: new Date() > assignment.dueDate ? 'late' : 'submitted'
      } },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ submission: { id: submission._id, status: submission.status, submittedAt: submission.submittedAt } });
  })
);

learningRouter.get('/assignments/:assignmentId/submissions/me', requireAuth, allowRoles('student'), param('assignmentId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const submission = await Submission.findOne({ assignment: req.params.assignmentId, student: req.user._id }).select('-fileReference.url').lean();
    if (submission) {
      const assignment = await Assignment.findById(req.params.assignmentId).select('maximumScore');
      submission.maximumScore = assignment?.maximumScore;
    }
    res.json({ submission });
  })
);

learningRouter.get('/assignments/:assignmentId/submissions', requireAuth, allowRoles('instructor', 'admin'), param('assignmentId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) throw new HttpError(404, 'Assignment not found.');
    await courseForInstructor(assignment.course, req.user);
    const submissions = await Submission.find({ assignment: assignment._id }).populate('student', 'name email').select('-fileReference.url').lean();
    res.json({ submissions });
  })
);

learningRouter.patch('/submissions/:submissionId/grade', requireAuth, allowRoles('instructor', 'admin'),
  param('submissionId').isMongoId(), body('grade').isFloat({ min: 0 }), body('feedback').optional().isString().isLength({ max: 5000 }), validateRequest,
  asyncRoute(async (req, res) => {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) throw new HttpError(404, 'Submission not found.');
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) throw new HttpError(404, 'Assignment not found.');
    await courseForInstructor(assignment.course, req.user);
    if (req.body.grade > assignment.maximumScore) throw new HttpError(400, 'Grade exceeds the assignment maximum score.');
    submission.grade = req.body.grade;
    submission.feedback = req.body.feedback || '';
    submission.status = 'reviewed';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();
    res.json({ submission: { id: submission._id, grade: submission.grade, feedback: submission.feedback, status: submission.status } });
  })
);

learningRouter.get('/submissions/:submissionId/file', requireAuth, param('submissionId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission?.fileReference?.url) throw new HttpError(404, 'File not found.');
    const owner = submission.student.toString() === req.user._id.toString();
    if (!owner && req.user.role !== 'admin') {
      const assignment = await Assignment.findById(submission.assignment);
      await courseForInstructor(assignment.course, req.user);
    }
    if (owner && req.user.role !== 'student') throw new HttpError(403, 'Only the submitting student can access this file.');
    res.download(path.join(uploadDirectory, path.basename(submission.fileReference.url)), submission.fileReference.title);
  })
);

learningRouter.get('/assignments/:assignmentId', requireAuth, param('assignmentId').isMongoId(), validateRequest,
  asyncRoute(async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId).populate('course', 'title').lean();
    if (!assignment) throw new HttpError(404, 'Assignment not found.');
    await verifyEnrollment(assignment.course._id, req.user._id);
    res.json({ assignment });
  })
);

learningRouter.get('/instructor/courses', requireAuth, allowRoles('instructor', 'admin'), asyncRoute(async (req, res) => {
  const filter = req.user.role === 'admin' ? { isArchived: false } : { instructor: req.user._id, isArchived: false };
  const courses = await Course.find(filter).sort({ updatedAt: -1 }).lean();
  const counts = await Enrollment.aggregate([{ $match: { course: { $in: courses.map((course) => course._id) } } }, { $group: { _id: '$course', count: { $sum: 1 } } }]);
  const countByCourse = new Map(counts.map((item) => [item._id.toString(), item.count]));
  res.json({ courses: courses.map((course) => ({ ...course, enrollmentCount: countByCourse.get(course._id.toString()) || 0 })) });
}));