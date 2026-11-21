/**
 * AegisLoom Security Lab — Origin & CSRF Defense Middleware
 * Ensures mutating HTTP methods (POST, PUT, PATCH, DELETE) come from trusted origins.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function verifyOriginCsrf(req: Request, res: Response, next: NextFunction): void {
  // Safe read-only methods don't require origin verification
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;

  // Non-browser or direct requests (health checks, curl, local test runners) without origin/referer
  if (!origin && !referer) {
    return next();
  }

  const allowedOrigins = env.CORS_ORIGIN.split(',').map(s => s.trim().toLowerCase());

  // Allow wildcard in development/testing
  if (allowedOrigins.includes('*')) {
    return next();
  }

  const candidate = origin || (referer ? new URL(referer).origin : '');

  if (candidate) {
    const isAllowed = allowedOrigins.some(allowed => {
      return allowed.toLowerCase() === candidate.toLowerCase();
    });

    if (!isAllowed) {
      return next(new AppError(`CSRF/Origin violation: Untrusted origin [${candidate}] blocked.`, 403, 'CSRF_BLOCKED'));
    }
  }

  next();
}
