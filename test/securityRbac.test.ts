process.env.ALEX_AUTH_SECRET = process.env.ALEX_AUTH_SECRET || 'alex-test-auth-secret-for-automated-tests-32chars!';
process.env.ALEX_OPERATOR_SECRET = process.env.ALEX_OPERATOR_SECRET || 'alex-test-operator-secret-for-tests-32chars!';

import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../server/middleware/auth';

test('SecurityRBAC - blocks requests without token or credentials with HTTP 401', () => {
  const middleware = requireRole(['commander']);

  let statusCode = 0;
  let jsonPayload: any = null;

  const mockReq: any = {
    headers: {},
  };

  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      jsonPayload = payload;
      return this;
    },
  };

  let nextCalled = false;
  middleware(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 401);
  assert.ok(jsonPayload.error.includes('UNAUTHORIZED'));
});

test('SecurityRBAC - blocks community role from performing commander operations with HTTP 403', () => {
  const middleware = requireRole(['commander']);

  let statusCode = 0;
  let jsonPayload: any = null;

  const mockReq: any = {
    headers: {
      'x-alex-role': 'community',
    },
    user: {
      userId: 'USR-COMM-1',
      role: 'community',
      agency: 'Public Citizen',
      tokenIssuedAt: new Date().toISOString(),
    },
  };

  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      jsonPayload = payload;
      return this;
    },
  };

  let nextCalled = false;
  middleware(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.ok(jsonPayload.error.includes('FORBIDDEN'));
  assert.equal(jsonPayload.currentRole, 'community');
});

test('SecurityRBAC - allows authenticated commander to proceed', () => {
  const middleware = requireRole(['commander']);

  const mockReq: any = {
    user: {
      userId: 'USR-CMD-01',
      role: 'commander',
      agency: 'District EOC',
      tokenIssuedAt: new Date().toISOString(),
    },
  };

  const mockRes: any = {};

  let nextCalled = false;
  middleware(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('SecurityRBAC - cryptographic HMAC-SHA256 signed token lifecycle and forgery rejection (Rule P0.2)', async () => {
  const { generateSignedToken, verifySignedToken } = await import('../server/auth/tokens');

  // 1. Generate valid token
  const validToken = generateSignedToken({
    userId: 'USR-CMD-DISTRICT-01',
    username: 'district_commander',
    role: 'incident_commander',
    agency: 'Nilgiris District EOC',
    expiresInSeconds: 3600,
  });

  const verified = verifySignedToken(validToken);
  assert.equal(verified.valid, true);
  assert.equal(verified.payload?.sub, 'USR-CMD-DISTRICT-01');
  assert.equal(verified.payload?.role, 'incident_commander');
  assert.equal(verified.payload?.iss, 'alex-security-gateway');

  // 2. Reject forged signature
  const parts = validToken.split('.');
  const forgedToken = `${parts[0]}.${parts[1]}.FORGED_SIGNATURE_BYTES_123456789`;
  const forgedResult = verifySignedToken(forgedToken);
  assert.equal(forgedResult.valid, false);
  assert.equal(forgedResult.code, 'INVALID_SIGNATURE');

  // 3. Reject expired token
  const expiredToken = generateSignedToken({
    userId: 'USR-OLD',
    username: 'old_operator',
    role: 'field_responder',
    agency: 'Forest Patrol',
    expiresInSeconds: -100, // Expired in past
  });
  const expiredResult = verifySignedToken(expiredToken);
  assert.equal(expiredResult.valid, false);
  assert.equal(expiredResult.code, 'TOKEN_EXPIRED');
});
