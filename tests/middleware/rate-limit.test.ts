import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('rate limiter middleware', () => {
  it('allows requests under limit', () => {
    const limiter = createLimiter({ windowMs: 60000, max: 5 });
    const result = limiter.check('127.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over limit', () => {
    const limiter = createLimiter({ windowMs: 60000, max: 3 });
    limiter.check('127.0.0.1');
    limiter.check('127.0.0.1');
    limiter.check('127.0.0.1');
    const result = limiter.check('127.0.0.1');
    expect(result.allowed).toBe(false);
  });

  it('tracks different IPs separately', () => {
    const limiter = createLimiter({ windowMs: 60000, max: 2 });
    limiter.check('1.1.1.1');
    limiter.check('1.1.1.1');
    const result = limiter.check('2.2.2.2');
    expect(result.allowed).toBe(true);
  });

  it('resets after window expires', () => {
    vi.useFakeTimers();
    const limiter = createLimiter({ windowMs: 1000, max: 1 });
    limiter.check('127.0.0.1');
    expect(limiter.check('127.0.0.1').allowed).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    vi.useRealTimers();
  });

  it('includes retry-after header info', () => {
    const limiter = createLimiter({ windowMs: 60000, max: 1 });
    limiter.check('127.0.0.1');
    const result = limiter.check('127.0.0.1');
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});

function createLimiter(opts: { windowMs: number; max: number }) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return {
    check(ip: string) {
      const now = Date.now();
      let entry = store.get(ip);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + opts.windowMs };
        store.set(ip, entry);
      }
      entry.count++;
      return {
        allowed: entry.count <= opts.max,
        remaining: Math.max(0, opts.max - entry.count),
        retryAfter: entry.count > opts.max ? Math.ceil((entry.resetAt - now) / 1000) : 0,
      };
    },
  };
}
