/**
 * AegisLoom Security Lab — Rate Limiting & Brute Force Defense Middleware
 * Protects against credential stuffing, DoS attempts, and automated quiz farming.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from './errorHandler';

/**
 * IP Reputation & Brute-Force Penalty Tracker
 */
interface IpViolation {
  count: number;
  blockedUntil?: number;
}
const ipViolationMap = new Map<string, IpViolation>();

/**
 * Middleware checking if an IP is temporarily locked out due to excessive failed authentications
 */
export function checkIpReputation(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const violation = ipViolationMap.get(ip);

  if (violation && violation.blockedUntil && Date.now() < violation.blockedUntil) {
    const remainingSec = Math.ceil((violation.blockedUntil - Date.now()) / 1000);
    return next(new AppError(`IP address temporarily throttled due to suspicious activity. Try again in ${remainingSec}s.`, 429, 'IP_THROTTLED'));
  }

  next();
}

/**
 * Records a security failure (e.g., failed admin login) for the calling IP.
 */
export function recordIpSecurityFailure(ip: string): void {
  const existing = ipViolationMap.get(ip) || { count: 0 };
  existing.count++;

  // After 10 failed attempts, block IP for 15 minutes
  if (existing.count >= 10) {
    existing.blockedUntil = Date.now() + 15 * 60 * 1000;
  }

  ipViolationMap.set(ip, existing);
}

/**
 * General API Rate Limiter
 */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this client. Please slow down and try again later.'
    }
  }
});

/**
 * Strict Auth Endpoint Limiter (Prevents brute-force on administrator login)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many failed authentication attempts. Account access temporarily throttled.'
    }
  }
});

/**
 * Simulation Form Submissions Limiter (Permits healthy training pace while throttling scripts)
 */
export const simulationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SIMULATION_RATE_LIMIT',
      message: 'Simulation interaction rate limit reached. Please pause to read the educational feedback.'
    }
  }
});

/**
 * Quiz Evaluation Limiter (Prevents automated brute-forcing of quiz answers)
 */
export const quizRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'QUIZ_RATE_LIMIT',
      message: 'Too many quiz submissions in a short period. Please review the training material before retrying.'
    }
  }
});

/**
 * URL reputation lookups may use a metered third-party service, so keep this
 * endpoint intentionally conservative.
 */
export const linkScannerRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'LINK_SCAN_RATE_LIMIT',
      message: 'Too many link checks in a short time. Please wait a minute and try again.'
    }
  }
});
