/**
 * AegisLoom Security Lab — Structured Error Handling Middleware
 * Sanitizes errors, correlates request IDs, and prevents information leakage.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || 'req-untracked';

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input parameters.',
        details: formattedErrors,
        requestId
      }
    });
    return;
  }

  // 2. Custom Application Errors (Operational)
  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'APPLICATION_ERROR',
        message: err.message,
        requestId
      }
    });
    return;
  }

  // 3. Unhandled Server Errors (Programming / Infrastructure)
  logger.error(`Unhandled internal error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please contact training administrators.',
      requestId,
      ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
    }
  });
}
