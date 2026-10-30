import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  'application/pdf', 'text/plain', 'application/zip',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});

export const assignmentUpload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(allowedMimeTypes.has(file.mimetype) ? null : new Error('Unsupported file type.'), allowedMimeTypes.has(file.mimetype))
});

export { uploadDirectory };