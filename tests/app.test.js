import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

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
});