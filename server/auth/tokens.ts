import crypto from 'crypto';

export type CanonicalRole =
  | 'public_viewer'
  | 'field_responder'
  | 'incident_commander'
  | 'system_administrator';

export interface TokenPayload {
  sub: string; // User ID
  username: string;
  role: CanonicalRole;
  agency: string;
  iat: number; // Issued at (seconds)
  exp: number; // Expires at (seconds)
  iss: string; // Issuer
  aud: string; // Audience
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  code?: 'TOKEN_EXPIRED' | 'INVALID_SIGNATURE' | 'MALFORMED_TOKEN' | 'UNAUTHORIZED_ISSUER';
}

// SEC-02 FIX: Fail closed when secret is absent. No hardcoded fallback in production.
function getSigningSecret(): string {
  const secret = process.env.ALEX_AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'ALEX_AUTH_SECRET environment variable is required and must be at least 32 characters. ' +
      'Set a secure random secret before starting the server.'
    );
  }
  return secret;
}

// Canonical roles and their self-registerable tier.
// Only public_viewer can be self-issued without server-side credential verification.
export const SELF_REGISTERABLE_ROLES: CanonicalRole[] = ['public_viewer'];
const TOKEN_ISSUER = 'alex-security-gateway';
const TOKEN_AUDIENCE = 'alex-platform';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Generates a cryptographically signed HMAC-SHA256 access token.
 * Zero client-controlled self-declarations per Rule 10 & P0.2.
 */
export function generateSignedToken(
  params: {
    userId: string;
    username: string;
    role: CanonicalRole;
    agency: string;
    expiresInSeconds?: number;
  },
  secret?: string
): string {
  const signingSecret = secret || getSigningSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (params.expiresInSeconds || 86400); // 24 hour default

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: TokenPayload = {
    sub: params.userId,
    username: params.username,
    role: params.role,
    agency: params.agency,
    iat: now,
    exp,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

/**
 * Verifies the cryptographic signature, expiration, issuer, and audience of an access token.
 * Prevents timing attacks via crypto.timingSafeEqual. Fails closed.
 */
export function verifySignedToken(
  token: string,
  secret?: string
): TokenVerificationResult {
  const signingSecret = (() => {
    try { return secret || getSigningSecret(); }
    catch { return null; }
  })();
  if (!signingSecret) {
    return { valid: false, error: 'Server signing secret not configured', code: 'MALFORMED_TOKEN' };
  }
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or empty', code: 'MALFORMED_TOKEN' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Token structure is malformed', code: 'MALFORMED_TOKEN' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // 1. Verify cryptographic signature
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { valid: false, error: 'Cryptographic signature is invalid', code: 'INVALID_SIGNATURE' };
  }

  // 2. Decode and validate payload
  try {
    const payloadText = base64UrlDecode(encodedPayload);
    const payload: TokenPayload = JSON.parse(payloadText);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired', code: 'TOKEN_EXPIRED' };
    }

    if (payload.iss !== TOKEN_ISSUER || payload.aud !== TOKEN_AUDIENCE) {
      return { valid: false, error: 'Invalid token issuer or audience', code: 'UNAUTHORIZED_ISSUER' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: 'Failed to parse token claims', code: 'MALFORMED_TOKEN' };
  }
}
