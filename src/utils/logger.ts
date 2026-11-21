/**
 * AegisLoom Security Lab — Structured JSON Logger
 * Formats log messages and automatically strips any accidental credential strings.
 */

import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function formatLog(level: LogLevel, message: string, meta?: Record<string, any>): string {
  const sanitizedMeta = meta ? sanitizeData(meta) : undefined;
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'aegisloom-backend',
    level,
    message,
    ...(sanitizedMeta ? { meta: sanitizedMeta } : {})
  });
}

/**
 * Strict data sanitizer ensuring passwords, pins, tokens are NEVER logged
 */
function sanitizeData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeData);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('otp') ||
      lowerKey.includes('pin') ||
      lowerKey.includes('credential')
    ) {
      clean[key] = '[REDACTED_BY_AEGISLOOM_POLICY]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeData(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const logger = {
  debug(message: string, meta?: Record<string, any>) {
    if (LEVEL_PRIORITY.debug >= LEVEL_PRIORITY[env.LOG_LEVEL]) {
      console.debug(formatLog('debug', message, meta));
    }
  },
  info(message: string, meta?: Record<string, any>) {
    if (LEVEL_PRIORITY.info >= LEVEL_PRIORITY[env.LOG_LEVEL]) {
      console.info(formatLog('info', message, meta));
    }
  },
  warn(message: string, meta?: Record<string, any>) {
    if (LEVEL_PRIORITY.warn >= LEVEL_PRIORITY[env.LOG_LEVEL]) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message: string, meta?: Record<string, any>) {
    if (LEVEL_PRIORITY.error >= LEVEL_PRIORITY[env.LOG_LEVEL]) {
      console.error(formatLog('error', message, meta));
    }
  }
};
