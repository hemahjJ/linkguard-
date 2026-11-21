/**
 * AegisLoom Security Lab — Administrator Authentication Middleware
 * Validates JWT access tokens for protected admin endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAdminAccessToken, AdminTokenPayload } from '../utils/token';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'] as string;
  }

  if (!token) {
    return next(new AppError('Authentication required. Missing authorization token.', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = verifyAdminAccessToken(token);
    req.admin = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Administrator session expired. Please re-authenticate.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid or corrupted authorization token.', 401, 'INVALID_TOKEN'));
  }
}
