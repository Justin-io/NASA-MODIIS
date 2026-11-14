import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRateLimiter } from '../server/middleware/rateLimiter';
import {
  maskIpAddress,
  sanitizePayloadForLogging,
} from '../server/middleware/sanitizedLogger';
import {
  sanitizeString,
  isValidCoordinate,
  validateAuthTokenInput,
  validateRouteInput,
  validateFieldReportInput,
  validateCorridorEvaluationInput,
  validateExportRequest,
} from '../server/middleware/validation';
import { securityHeadersMiddleware } from '../server/middleware/auth';
import { globalStore } from '../server/db/store';

// ---------------------------------------------------------------------------
// 1. Rate Limiting Tests
// ---------------------------------------------------------------------------

test('RateLimiter - allows requests under the configured threshold', () => {
  const limiter = new MemoryRateLimiter({
    windowMs: 1000,
    maxRequests: 3,
    skipInTests: false,
  });

  const headers: Record<string, any> = {};
  const mockRes: any = {
    setHeader(key: string, val: any) {
      headers[key] = val;
    },
    status() {
      return this;
    },
    json() {
      return this;
    },
  };

  let nextCalls = 0;
  const mockReq: any = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };

  for (let i = 0; i < 3; i++) {
    limiter.middleware()(mockReq, mockRes, () => {
      nextCalls++;
    });
  }

  assert.equal(nextCalls, 3);
  assert.equal(headers['RateLimit-Limit'], 3);
  assert.equal(headers['RateLimit-Remaining'], 0);
  limiter.destroy();
});

test('RateLimiter - returns HTTP 429 when max requests exceeded with Retry-After', () => {
  const limiter = new MemoryRateLimiter({
    windowMs: 2000,
    maxRequests: 2,
    skipInTests: false,
  });

  let statusCode = 0;
  let jsonResponse: any = null;
  const headers: Record<string, any> = {};

  const mockRes: any = {
    setHeader(key: string, val: any) {
      headers[key] = val;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonResponse = body;
      return this;
    },
  };

  const mockReq: any = { headers: {}, socket: { remoteAddress: '10.0.0.2' }, traceId: 'TRC-RATE-01' };

  // First 2 requests succeed
  limiter.middleware()(mockReq, mockRes, () => {});
  limiter.middleware()(mockReq, mockRes, () => {});

  // 3rd request gets blocked
  let nextCalled = false;
  limiter.middleware()(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 429);
  assert.ok(jsonResponse.error.includes('Too many requests'));
  assert.equal(jsonResponse.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(Number(headers['Retry-After']) >= 1);
  assert.equal(headers['RateLimit-Remaining'], 0);

  limiter.destroy();
});

test('RateLimiter - prunes expired IP buckets cleanly', () => {
  const limiter = new MemoryRateLimiter({
    windowMs: 50,
    maxRequests: 5,
    skipInTests: false,
  });

  const mockReq: any = { headers: {}, socket: { remoteAddress: '192.168.1.100' } };
  const mockRes: any = { setHeader() {}, status() { return this; }, json() { return this; } };

  limiter.middleware()(mockReq, mockRes, () => {});
  assert.equal(limiter.getBucketCount('192.168.1.100'), 1);

  // Wait for window to expire
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      limiter.pruneExpired();
      assert.equal(limiter.getBucketCount('192.168.1.100'), 0);
      limiter.destroy();
      resolve();
    }, 60);
  });
});

// ---------------------------------------------------------------------------
// 2. Sanitized Structured Logging & PII Masking Tests
// ---------------------------------------------------------------------------

test('SanitizedLogger - masks IPv4 and IPv6 addresses correctly', () => {
  assert.equal(maskIpAddress('192.168.1.42'), '192.168.1.xxx');
  assert.equal(maskIpAddress('10.200.45.12'), '10.200.45.xxx');
  assert.equal(maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), '2001:0db8:85a3::xxxx');
  assert.equal(maskIpAddress(null), '0.0.0.0');
});

test('SanitizedLogger - strips secrets and redacts PII in log payloads', () => {
  const payload = {
    username: 'fire_officer_1',
    password: 'SuperSecretPassword123!',
    authorization: 'Bearer secret_token_xyz',
    contactEmail: 'responder@tamilnadu.gov.in',
    phone: '+91 98401 23456',
    notes: 'Called +91 423 224411 and emailed commander@eoc.gov to report front',
  };

  const sanitized = sanitizePayloadForLogging(payload);

  assert.equal(sanitized.password, '[REDACTED_SECRET]');
  assert.equal(sanitized.authorization, '[REDACTED_SECRET]');
  assert.equal(sanitized.username, 'fire_officer_1');
  assert.equal(sanitized.contactEmail, 'r***@tamilnadu.gov.in');
  assert.ok(!sanitized.notes.includes('commander@eoc.gov'));
  assert.ok(sanitized.notes.includes('***-***-****'));
});

// ---------------------------------------------------------------------------
// 3. Zero-Trust Input Validation & Sanitization Tests
// ---------------------------------------------------------------------------

test('ZeroTrustValidation - sanitizeString strips HTML/script tags and control characters', () => {
  const dirty = '<script>alert("xss")</script>Forest Beat \x00#4\x08 Hazard <iframe src="evil.com"></iframe>';
  const clean = sanitizeString(dirty);

  assert.equal(clean, 'alert("xss")Forest Beat #4 Hazard');
  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('<iframe>'));
  assert.ok(!clean.includes('\x00'));
});

test('ZeroTrustValidation - isValidCoordinate validates geodetic latitude and longitude bounds', () => {
  assert.equal(isValidCoordinate(11.41, 76.70), true);
  assert.equal(isValidCoordinate(-90, 180), true);
  assert.equal(isValidCoordinate(90, -180), true);

  // Out of range
  assert.equal(isValidCoordinate(91, 76.70), false);
  assert.equal(isValidCoordinate(-90.1, 76.70), false);
  assert.equal(isValidCoordinate(11.41, 180.1), false);
  assert.equal(isValidCoordinate(11.41, -181), false);

  // Invalid types
  assert.equal(isValidCoordinate(NaN, 76.70), false);
  assert.equal(isValidCoordinate(11.41, Infinity), false);
  assert.equal(isValidCoordinate('11.41' as any, 76.70), false);
});

test('ZeroTrustValidation - validateAuthTokenInput rejects dangerous or malformed usernames', () => {
  const testCases = [
    { username: '../../etc/passwd', valid: false },
    { username: '<script>alert(1)</script>', valid: false },
    { username: 'ab', valid: false }, // too short (<3)
    { username: 'a'.repeat(65), valid: false }, // too long (>64)
    { username: 'valid_commander-01', valid: true },
    { username: 'user.name_test', valid: true },
  ];

  for (const tc of testCases) {
    let statusCode = 0;
    let nextCalled = false;

    const mockReq: any = { body: { username: tc.username } };
    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    validateAuthTokenInput(mockReq, mockRes, () => {
      nextCalled = true;
    });

    if (tc.valid) {
      assert.equal(nextCalled, true, `Expected ${tc.username} to be accepted`);
    } else {
      assert.equal(nextCalled, false, `Expected ${tc.username} to be rejected`);
      assert.equal(statusCode, 400);
    }
  }
});

test('ZeroTrustValidation - validateRouteInput rejects invalid coordinates and unsupported vehicles', () => {
  let statusCode = 0;
  let jsonRes: any = null;

  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonRes = body;
      return this;
    },
  };

  // 1. Invalid coordinates
  const mockReq1: any = {
    body: {
      origin: [999, 76.69], // lat > 90
      destination: [11.40, 76.70],
    },
  };
  validateRouteInput(mockReq1, mockRes, () => {});
  assert.equal(statusCode, 400);
  assert.equal(jsonRes.code, 'INVALID_ORIGIN_COORDINATES');

  // 2. Unsupported vehicle category
  const mockReq2: any = {
    body: {
      origin: [11.41, 76.69],
      destination: [11.40, 76.70],
      vehicleCategory: 'spaceship_cruiser',
    },
  };
  validateRouteInput(mockReq2, mockRes, () => {});
  assert.equal(statusCode, 400);
  assert.equal(jsonRes.code, 'INVALID_VEHICLE_CATEGORY');
});

test('ZeroTrustValidation - validateCorridorEvaluationInput validates vehicle physical dimensions', () => {
  let statusCode = 0;
  let jsonRes: any = null;

  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonRes = body;
      return this;
    },
  };

  // Impossible negative weight
  validateCorridorEvaluationInput(
    { body: { vehicleWeightTons: -5, vehicleHeightMeters: 3.2 } } as any,
    mockRes,
    () => {}
  );
  assert.equal(statusCode, 400);
  assert.equal(jsonRes.code, 'INVALID_VEHICLE_WEIGHT');

  // Impossible height (>15 meters)
  validateCorridorEvaluationInput(
    { body: { vehicleWeightTons: 18, vehicleHeightMeters: 25.0 } } as any,
    mockRes,
    () => {}
  );
  assert.equal(statusCode, 400);
  assert.equal(jsonRes.code, 'INVALID_VEHICLE_HEIGHT');
});

test('ZeroTrustValidation - validateExportRequest guards against empty incidents and validates format', () => {
  let statusCode = 0;
  let jsonRes: any = null;

  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      jsonRes = body;
      return this;
    },
  };

  // Unsupported format
  validateExportRequest({ params: { format: 'unsupported_tar' } } as any, mockRes, () => {});
  assert.equal(statusCode, 400);
  assert.equal(jsonRes.code, 'UNSUPPORTED_EXPORT_FORMAT');

  // When store has incidents, supported formats proceed
  const originalIncidents = globalStore.getIncidents();
  globalStore.getState().incidents = [
    {
      id: 'INC-TEST-01',
      title: 'Test Thermal Anomaly',
      region: 'REG-NILGIRI',
      district: 'The Nilgiris',
      severity: 'moderate',
      status: 'field_confirmed',
      coordinates: { lat: 11.41, lng: 76.70 },
      uncertaintyRadiusMeters: 375,
      firstObserved: new Date().toISOString(),
      latestObserved: new Date().toISOString(),
      modisCount: 1,
      viirsCount: 2,
      harmonizedFrpMw: 25.0,
      historicalMedianFrpMw: 18.0,
      vegetationDrynessIndex: 45,
      soilMoisturePct: 30,
      windSpeedKmh: 12,
      windDirectionDeg: 270,
      windCompass: 'W',
      temperatureC: 22,
      humidityPct: 55,
      estimatedAreaHa: 10,
      estimatedPopulationExposed: 0,
      affectedAssets: [],
      recommendedStaging: [],
      sourceProvenance: ['NASA FIRMS NRT'],
      summary: 'Test hotspot',
      unverifiedNotes: '',
      authorityStatus: 'Monitoring Only',
      observations: [],
      timeline: [],
    },
  ];

  let nextCalled = false;
  validateExportRequest({ params: { format: 'geojson' } } as any, mockRes, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  // Restore store
  globalStore.getState().incidents = originalIncidents;
});

// ---------------------------------------------------------------------------
// 4. Security Headers & Express Fingerprint Masking Tests
// ---------------------------------------------------------------------------

test('SecurityHeaders - strips X-Powered-By and enforces HSTS preload and camera restrictions', () => {
  const headersSet: Record<string, string> = {};
  let removedHeader = '';

  const mockRes: any = {
    setHeader(key: string, val: string) {
      headersSet[key] = val;
    },
    removeHeader(key: string) {
      removedHeader = key;
    },
  };

  securityHeadersMiddleware({} as any, mockRes, () => {});

  assert.equal(removedHeader, 'X-Powered-By');
  assert.equal(headersSet['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains; preload');
  assert.ok(headersSet['Permissions-Policy'].includes('microphone=(self)'));
  assert.ok(headersSet['Permissions-Policy'].includes('camera=()'));
  assert.equal(headersSet['Cross-Origin-Opener-Policy'], 'same-origin');
});

// ---------------------------------------------------------------------------
// 5. Vercel Serverless Function & Express Export Verification
// ---------------------------------------------------------------------------

test('VercelServerless - exports Express app directly with cold-start middleware and Vercel CORS support', async () => {
  const apiModule = await import('../api/index');
  const serverlessApp = apiModule.default;

  assert.equal(typeof serverlessApp, 'function');
  assert.equal(typeof (serverlessApp as any).handle, 'function');
  assert.equal(typeof (serverlessApp as any).use, 'function');
});


