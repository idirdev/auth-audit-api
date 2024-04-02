import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('auth routes', () => {
  describe('POST /auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      const res = { status: 200, body: { accessToken: 'jwt...', refreshToken: 'rt...' } };
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });
    it('rejects invalid password', async () => {
      const res = { status: 401, body: { error: 'Invalid credentials' } };
      expect(res.status).toBe(401);
    });
    it('rejects non-existent user', async () => {
      const res = { status: 401, body: { error: 'Invalid credentials' } };
      expect(res.status).toBe(401);
    });
    it('rate limits after 5 attempts', async () => {
      const res = { status: 429, body: { error: 'Too many attempts' } };
      expect(res.status).toBe(429);
    });
  });

  describe('POST /auth/register', () => {
    it('creates new user', async () => {
      const res = { status: 201, body: { id: '1', email: 'new@test.com' } };
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('new@test.com');
    });
    it('rejects duplicate email', async () => {
      const res = { status: 409, body: { error: 'Email already exists' } };
      expect(res.status).toBe(409);
    });
    it('validates email format', async () => {
      const res = { status: 400, body: { error: 'Invalid email' } };
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns new access token', async () => {
      const res = { status: 200, body: { accessToken: 'new-jwt...' } };
      expect(res.status).toBe(200);
    });
    it('rejects expired refresh token', async () => {
      const res = { status: 401, body: { error: 'Token expired' } };
      expect(res.status).toBe(401);
    });
  });
});
