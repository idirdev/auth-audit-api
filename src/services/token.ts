import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const blacklist = new Set<string>();

export function generateTokenPair(payload: TokenPayload, secret: string): TokenPair {
  const accessToken = jwt.sign(payload, secret, {
    expiresIn: '15m',
    issuer: 'auth-audit-api',
    audience: 'api',
  });

  const refreshToken = jwt.sign({ userId: payload.userId, type: 'refresh' }, secret, {
    expiresIn: '7d',
    issuer: 'auth-audit-api',
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string, secret: string): TokenPayload | null {
  if (blacklist.has(token)) return null;
  try {
    return jwt.verify(token, secret, { issuer: 'auth-audit-api' }) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string, secret: string): { userId: string } | null {
  if (blacklist.has(token)) return null;
  try {
    const payload = jwt.verify(token, secret, { issuer: 'auth-audit-api' }) as any;
    if (payload.type !== 'refresh') return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function revokeToken(token: string): void {
  blacklist.add(token);
}

export function isRevoked(token: string): boolean {
  return blacklist.has(token);
}

export function rotateRefreshToken(
  oldToken: string,
  userId: string,
  email: string,
  role: string,
  secret: string
): TokenPair | null {
  const verified = verifyRefreshToken(oldToken, secret);
  if (!verified) return null;
  revokeToken(oldToken);
  return generateTokenPair({ userId, email, role }, secret);
}
