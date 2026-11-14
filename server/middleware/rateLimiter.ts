import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  code?: string;
  skipInTests?: boolean;
}

/**
 * High-performance in-memory sliding-window rate limiter.
 * Automatically cleans up expired buckets to eliminate memory leaks.
 */
export class MemoryRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly message: string;
  private readonly code: string;
  private readonly skipInTests: boolean;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message = options.message || 'Too many requests. Please throttle your rate of requests.';
    this.code = options.code || 'RATE_LIMIT_EXCEEDED';
    this.skipInTests = options.skipInTests ?? true;

    // Periodic cleanup of expired buckets every 60 seconds (disabled in serverless/tests)
    if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.cleanupTimer = setInterval(() => this.pruneExpired(), 60000);
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (this.skipInTests && process.env.NODE_ENV === 'test') {
        return next();
      }

      const clientIp = this.getClientIp(req);
      const now = Date.now();
      let bucket = this.buckets.get(clientIp);

      if (!bucket || now >= bucket.resetTime) {
        bucket = {
          count: 1,
          resetTime: now + this.windowMs,
        };
        this.buckets.set(clientIp, bucket);
      } else {
        bucket.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - bucket.count);
      const resetSeconds = Math.ceil((bucket.resetTime - now) / 1000);

      res.setHeader('RateLimit-Limit', this.maxRequests);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetSeconds);

      if (bucket.count > this.maxRequests) {
        res.setHeader('Retry-After', resetSeconds);
        res.status(429).json({
          error: this.message,
          code: this.code,
          retryAfterSeconds: resetSeconds,
          traceId: req.traceId,
        });
        return;
      }

      next();
    };
  }

  public pruneExpired(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetTime) {
        this.buckets.delete(key);
      }
    }
  }

  public reset(): void {
    this.buckets.clear();
  }

  public getBucketCount(ip: string): number {
    return this.buckets.get(ip)?.count ?? 0;
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0].trim();
      if (first) return first;
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }
}

/** Global API rate limiter: 300 requests / minute per IP */
export const globalRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'API rate limit exceeded. Maximum 300 requests per minute allowed.',
  code: 'GLOBAL_RATE_LIMIT_EXCEEDED',
});

/** Strict Auth rate limiter: 10 requests / minute per IP to prevent brute-force */
export const authRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Authentication rate limit exceeded. Maximum 10 token requests per minute allowed.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

/** Sensitive operations rate limiter: 30 requests / minute per IP */
export const sensitiveApiLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Operational mutation rate limit exceeded. Please throttle sensitive requests.',
  code: 'OPERATION_RATE_LIMIT_EXCEEDED',
});

