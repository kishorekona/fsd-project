import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hasValidQuizAnswerIndexes, isAllowedAssignmentFile } from '../src/routes/learning.js';

const app = createApp();

afterEach(() => {
  delete process.env.JWT_SECRET;
});

describe('API foundation', () => {
  it('reports a healthy API', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects protected API access without a bearer token', async () => {
    const response = await request(app).get('/api/enrollments/me');
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/sign in/i);
  });

  it('validates registration before database access', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'A', email: 'invalid', password: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBeTruthy();
  });

  it('does not allow public self-promotion to admin role', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test Person', email: 'test@example.com', password: 'long-enough-password', role: 'admin' });
    expect(response.status).toBe(400);
  });

  it('returns a consistent not-found response', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Route not found.');
  });

  it('serves the client app for nested routes when a production build exists', async () => {
    const response = await request(app).get('/courses/example-course');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<div id="root"></div>');
  });
});

describe('learning input validation', () => {
  it('accepts quiz answers that point to an available option', () => {
    expect(hasValidQuizAnswerIndexes([{ options: ['A', 'B'], correctOption: 1 }])).toBe(true);
  });

  it('rejects quiz answers outside the available options', () => {
    expect(hasValidQuizAnswerIndexes([{ options: ['A', 'B'], correctOption: 2 }])).toBe(false);
    expect(hasValidQuizAnswerIndexes([{ options: ['A', 'B'], correctOption: -1 }])).toBe(false);
    expect(hasValidQuizAnswerIndexes([{ correctOption: 0 }])).toBe(false);
  });

  it('matches assignment file extensions case-insensitively', () => {
    expect(isAllowedAssignmentFile('work.PDF', ['pdf'])).toBe(true);
    expect(isAllowedAssignmentFile('work.exe', ['pdf'])).toBe(false);
    expect(isAllowedAssignmentFile('work.exe', [])).toBe(true);
  });
});