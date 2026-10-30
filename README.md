# Luma — Learning, made personal

A MERN learning-management-system starter with a responsive React student dashboard and an Express/Mongoose API. It includes course, enrollment, lesson-progress, assignment, submission, quiz, and quiz-attempt data models and routes.

## Setup

1. Install Node.js 20 or newer.
2. Rotate the MongoDB Atlas database user's password because the previous URI was shared in chat. Never commit database credentials.
3. Copy `.env.example` to `.env`; set `MONGODB_URI` to the rotated Atlas URI. The `.env` file is ignored by Git.
4. In Atlas, allow your computer's IP address in Network Access and confirm the database user has appropriate permissions.
5. Run `npm install` and then `npm run dev`.
6. Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The Express API runs on port 3000 and Vite proxies `/api` requests to it.

For a production frontend build, run `npm run build`. Start the API with `npm start`.

## API overview

- `GET /api/health` — server/database status
- `GET /api/courses`, `POST /api/courses` — list and create courses
- `POST /api/courses/:courseId/enroll` — enroll a student
- `PATCH /api/enrollments/:enrollmentId/progress` — mark a lesson complete
- `GET /api/assignments`, `POST /api/assignments` — list/create assignments
- `POST /api/assignments/:assignmentId/submissions` — submit assignment content or a file URL
- `GET /api/quizzes`, `POST /api/quizzes` — list/create quizzes
- `POST /api/quizzes/:quizId/attempts` — score and save a quiz attempt

The dashboard uses sample presentation data until the API returns courses and assignments. Authentication, role authorization, file storage, and instructor-specific analytics should be added before production use. Quiz creation should be protected because quiz documents include correct answers.