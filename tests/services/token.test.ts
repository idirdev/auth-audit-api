import { describe, it, expect } from 'vitest';
import { generateTokenPair, verifyAccessToken, revokeToken, isRevoked } from '../../src/services/token';

const SECRET = 'test-secret-key-for-testing';

describe('token service', () => {
  const payload = { userId: '1', email: 'test@test.com', role: 'user' };

  it('generates token pair', () => {
    const pair = generateTokenPair(payload, SECRET);
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(pair.accessToken).not.toBe(pair.refreshToken);
  });

  it('verifies valid access token', () => {
    const pair = generateTokenPair(payload, SECRET);
    const verified = verifyAccessToken(pair.accessToken, SECRET);
    expect(verified?.userId).toBe('1');
    expect(verified?.email).toBe('test@test.com');
  });

  it('rejects invalid token', () => {
    expect(verifyAccessToken('invalid', SECRET)).toBeNull();
  });

  it('rejects token with wrong secret', () => {
    const pair = generateTokenPair(payload, SECRET);
    expect(verifyAccessToken(pair.accessToken, 'wrong-secret')).toBeNull();
  });

  it('revokes token', () => {
    const pair = generateTokenPair(payload, SECRET);
    revokeToken(pair.accessToken);
    expect(isRevoked(pair.accessToken)).toBe(true);
    expect(verifyAccessToken(pair.accessToken, SECRET)).toBeNull();
  });
});
