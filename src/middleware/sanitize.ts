/**
 * AegisLoom Security Lab — Input Sanitization & Anti-Injection Middleware
 * Defends against Prototype Pollution, Null-Byte string termination, and malformed structures.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively scans an object for prototype pollution payloads.
 */
function checkPrototypePollution(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (checkPrototypePollution(item)) return true;
    }
    return false;
  }

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (checkPrototypePollution(obj[key])) return true;
    }
  }

  return false;
}

/**
 * Recursively scans for dangerous null bytes (\0) which can lead to poisoning or path traversal.
 */
function checkNullBytes(obj: any): boolean {
  if (typeof obj === 'string') {
    return obj.indexOf('\0') !== -1;
  }
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  for (const key of Object.keys(obj)) {
    if (checkNullBytes(key) || checkNullBytes(obj[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Global Request Sanitization Middleware
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction): void {
  // 1. Prototype Pollution Defense
  if (checkPrototypePollution(req.body) || checkPrototypePollution(req.query) || checkPrototypePollution(req.params)) {
    return next(new AppError('Suspicious payload detected: Prototype pollution attempt blocked.', 400, 'SECURITY_VIOLATION'));
  }

  // 2. Null-Byte Poisoning Defense
  if (checkNullBytes(req.body) || checkNullBytes(req.query) || checkNullBytes(req.params)) {
    return next(new AppError('Suspicious payload detected: Null byte injection attempt blocked.', 400, 'SECURITY_VIOLATION'));
  }

  next();
}

/**
 * XSS escaping helper for safe text reflection
 */
export function sanitizeXss(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
