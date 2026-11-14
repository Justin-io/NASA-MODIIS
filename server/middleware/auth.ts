import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../src/shared/types';
import { CanonicalRole, verifySignedToken, TokenPayload } from '../auth/tokens';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: CanonicalRole;
  agency: string;
  tokenIssuedAt: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      traceId?: string;
    }
  }
}

/**
 * Maps legacy role aliases to strict canonical roles.
 */
export function normalizeToCanonicalRole(role: string): CanonicalRole {
  switch (role) {
    case 'system_administrator':
    case 'admin':
      return 'system_administrator';
    case 'incident_commander':
    case 'commander':
      return 'incident_commander';
    case 'field_responder':
    case 'field':
    case 'operator':
      return 'field_responder';
    case 'public_viewer':
    case 'community':
    case 'scientist':
    case 'analyst':
    default:
      return 'public_viewer';
  }
}

/**
 * Validates cryptographically signed access token (HMAC-SHA256 JWT).
 * Rejects client-side role declarations (X-ALEX-Role) per Rule 10 & P0.2.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    // Public requests proceed without req.user; protected routes will fail in requireRole
    next();
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED: Malformed Authorization header. Expected Bearer <token>.',
      code: 'INVALID_AUTH_HEADER',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  const verification = verifySignedToken(token);

  if (!verification.valid || !verification.payload) {
    res.status(401).json({
      error: `UNAUTHORIZED: ${verification.error || 'Invalid token'}`,
      code: verification.code || 'AUTHENTICATION_FAILED',
    });
    return;
  }

  const payload: TokenPayload = verification.payload;

  req.user = {
    userId: payload.sub,
    username: payload.username,
    role: normalizeToCanonicalRole(payload.role),
    agency: payload.agency,
    tokenIssuedAt: new Date(payload.iat * 1000).toISOString(),
  };

  next();
}

/**
 * Enforces Role-Based Access Control (RBAC) on mutating or sensitive routes.
 * Blocks unauthenticated clients (HTTP 401) or unauthorized roles (HTTP 403). Fails closed.
 */
export function requireRole(permittedRoles: (CanonicalRole | UserRole)[]) {
  const canonicalPermitted = new Set(permittedRoles.map((r) => normalizeToCanonicalRole(r)));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED: Cryptographically signed bearer token required for operational mutation.',
        requiredRoles: Array.from(canonicalPermitted),
        directive: 'Obtain a signed access token via POST /api/auth/token.',
      });
      return;
    }

    const userCanonicalRole = normalizeToCanonicalRole(req.user.role);
    if (!canonicalPermitted.has(userCanonicalRole)) {
      res.status(403).json({
        error: `FORBIDDEN: User role '${req.user.role}' lacks sufficient clearance for this operation.`,
        requiredRoles: Array.from(canonicalPermitted),
        currentRole: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Trace ID correlation middleware for zero-trust request auditability.
 */
export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingTrace = req.headers['x-trace-id'] as string;
  const traceId = (incomingTrace && /^[a-zA-Z0-9_-]{8,64}$/.test(incomingTrace))
    ? incomingTrace
    : crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}

/**
 * Utility to securely mask API keys and secrets for diagnostics and telemetry.
 */
export function maskSecret(secret: string | null | undefined, visibleChars = 4): string {
  if (!secret) return '[UNCONFIGURED]';
  if (secret.length <= visibleChars * 2) return '****';
  return `${secret.slice(0, visibleChars)}...${secret.slice(-visibleChars)}`;
}

/**
 * Security headers middleware enforcing OWASP API protections.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (typeof res.removeHeader === 'function') {
    res.removeHeader('X-Powered-By');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  next();
}
