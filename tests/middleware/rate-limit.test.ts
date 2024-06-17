import { describe, it, expect } from 'vitest';
import { rateLimiter, authLimiter } from '../../src/middleware/rate-limit';

describe('rate limiter middleware', () => {
  it('rateLimiter is defined and is a function (express middleware)', () => {
    expect(rateLimiter).toBeDefined();
    expect(typeof rateLimiter).toBe('function');
  });

  it('rateLimiter has 3-arity middleware signature', () => {
    // express-rate-limit returns a middleware function with (req, res, next)
    expect(rateLimiter.length).toBe(3);
  });

  it('authLimiter is defined and is a function (express middleware)', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('authLimiter has 3-arity middleware signature', () => {
    expect(authLimiter.length).toBe(3);
  });
});
