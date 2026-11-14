import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEY_PATTERN = /(authorization|token|secret|password|key|cookie|credit|ssn|auth)/i;
const PHONE_PATTERN = /(\+?[0-9]{1,3}[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g;
const EMAIL_PATTERN = /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g;

/**
 * Masks IPv4 or IPv6 address for privacy preservation (GDPR / DPDP compliance).
 */
export function maskIpAddress(ip: string | undefined | null): string {
  if (!ip) return '0.0.0.0';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 3).join(':')}::xxxx`;
  }
  return 'masked-ip';
}

/**
 * Sanitizes object, string, or query payloads by masking secrets and PII.
 */
export function sanitizePayloadForLogging(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let sanitized = data;
    // Mask emails
    sanitized = sanitized.replace(EMAIL_PATTERN, (_match, user, domain, tld) => {
      const visible = user.slice(0, 1);
      return `${visible}***@${domain}.${tld}`;
    });
    // Mask phone numbers
    sanitized = sanitized.replace(PHONE_PATTERN, '***-***-****');
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayloadForLogging(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitizedObj[key] = '[REDACTED_SECRET]';
      } else {
        sanitizedObj[key] = sanitizePayloadForLogging(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

/**
 * Structured request audit logger middleware with trace ID and PII stripping.
 */
export function sanitizedAuditLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const traceId = req.traceId || 'unknown-trace';
  const rawIp = req.socket?.remoteAddress || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
  const maskedIp = maskIpAddress(rawIp.split(',')[0].trim());

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userId = req.user?.userId || 'anonymous';
    const role = req.user?.role || 'public';

    if (process.env.NODE_ENV !== 'test') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        traceId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: statusCode,
        durationMs,
        clientIp: maskedIp,
        actor: {
          userId,
          role,
        },
      };

      if (statusCode >= 400) {
        console.warn(`[AUDIT_SECURITY_WARN][${traceId}] ${req.method} ${req.url} -> ${statusCode} (${durationMs}ms) [User: ${userId}, IP: ${maskedIp}]`);
      } else {
        console.log(`[AUDIT][${traceId}] ${req.method} ${req.url} -> ${statusCode} (${durationMs}ms) [User: ${userId}, IP: ${maskedIp}]`);
      }
    }
  });

  next();
}
