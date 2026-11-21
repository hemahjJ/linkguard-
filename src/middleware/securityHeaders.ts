/**
 * AegisLoom Security Lab — Security Headers & HTTPS Enforcement Middleware
 * Sets hardened HTTP headers, HSTS, strict CSP, Permissions Policy, and ensures secure communications.
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';

/**
 * Enhanced Helmet configuration
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: env.ENFORCE_HTTPS ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: env.ENFORCE_HTTPS ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Permissions-Policy header configuration (Disables invasive APIs)
 */
export function permissionsPolicy(req: Request, res: Response, next: NextFunction): void {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=(), interest-cohort=()'
  );
  next();
}

/**
 * HTTPS Enforcement middleware for production reverse proxies
 */
export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (env.ENFORCE_HTTPS && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
}

/**
 * Injects unique Request ID for distributed tracing & Simulation Notice
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);
  res.setHeader('X-Simulation-Notice', 'AegisLoom-Authorized-Training-Only');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
}

/**
 * Cache prevention middleware for all sensitive API endpoints
 */
export function noCache(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}
