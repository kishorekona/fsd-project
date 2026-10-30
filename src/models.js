import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student', index: true },
  requestedRole: { type: String, enum: ['student', 'instructor'], default: 'student' },
  isApproved: { type: Boolean, default: false },
  profileImage: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 1000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const resourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  mimeType: { type: String, default: '' }
}, { _id: true });

const lessonSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 3000 },
  videoUrl: { type: String, default: '', maxlength: 2048 },
  textContent: { type: String, default: '', maxlength: 20000 },
  resources: { type: [resourceSchema], default: [] },
  durationMinutes: { type: Number, min: 0, default: 10 },
  order: { type: Number, min: 0, default: 0 },
  isPreview: { type: Boolean, default: false }
}, { timestamps: true });

const moduleSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 1000 },
  order: { type: Number, min: 0, default: 0 },
  lessons: { type: [lessonSchema], default: [] }
}, { timestamps: true });

const courseSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  shortDescription: { type: String, default: '', maxlength: 300 },
  description: { type: String, default: '', maxlength: 10000 },
  thumbnail: { type: String, default: '', maxlength: 2048 },
  category: { type: String, default: 'General', trim: true, maxlength: 80, index: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all-levels'], default: 'all-levels' },
  instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  learningObjectives: [{ type: String, trim: true, maxlength: 300 }],
  prerequisites: [{ type: String, trim: true, maxlength: 300 }],
  estimatedDurationMinutes: { type: Number, min: 0, default: 0 },
  modules: { type: [moduleSchema], default: [] },
  isPublished: { type: Boolean, default: false, index: true },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });
courseSchema.index({ title: 'text', shortDescription: 'text', description: 'text', category: 'text' });

const enrollmentSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  completedLessons: [{ type: Schema.Types.ObjectId }],
  completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
}, { timestamps: true });
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const quizSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  moduleId: { type: Schema.Types.ObjectId },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  instructions: { type: String, default: '', maxlength: 3000 },
  questions: [{
    prompt: { type: String, required: true, maxlength: 2000 },
    options: [{ type: String, required: true, maxlength: 500 }],
    correctOption: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: '', maxlength: 1000 }
  }],
  passingScore: { type: Number, min: 0, max: 100, default: 70 },
  timeLimitMinutes: { type: Number, min: 0, default: 0 },
  attemptLimit: { type: Number, min: 1, default: 3 },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

const quizAttemptSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  submittedAnswers: [{ type: Number, min: 0 }],
  score: { type: Number, min: 0, max: 100, required: true },
  passed: { type: Boolean, required: true },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });
quizAttemptSchema.index({ student: 1, quiz: 1, submittedAt: -1 });

const assignmentSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  instructions: { type: String, required: true, maxlength: 10000 },
  dueDate: { type: Date, required: true, index: true },
  allowedFileTypes: [{ type: String, lowercase: true, trim: true }],
  maximumFileSize: { type: Number, min: 1, default: 10 * 1024 * 1024 },
  maximumScore: { type: Number, min: 1, default: 100 },
  allowLateSubmissions: { type: Boolean, default: false }
}, { timestamps: true });

const submissionSchema = new Schema({
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  textResponse: { type: String, default: '', maxlength: 20000 },
  fileReference: { type: resourceSchema, default: undefined },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'reviewed', 'late'], default: 'submitted' },
  grade: { type: Number, min: 0 },
  feedback: { type: String, default: '', maxlength: 5000 },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export const User = model('User', userSchema);
export const Course = model('Course', courseSchema);
export const Enrollment = model('Enrollment', enrollmentSchema);
export const Quiz = model('Quiz', quizSchema);
export const QuizAttempt = model('QuizAttempt', quizAttemptSchema);
export const Assignment = model('Assignment', assignmentSchema);
export const Submission = model('Submission', submissionSchema);