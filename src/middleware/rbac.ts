/**
 * AegisLoom Security Lab — Role-Based Access Control (RBAC) Middleware
 * Enforces granular permissions for super_admin, training_manager, and analyst roles.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export type AdminRole = 'super_admin' | 'training_manager' | 'analyst';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 3,
  training_manager: 2,
  analyst: 1
};

export function requireRole(minimumRole: AdminRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const userLevel = ROLE_HIERARCHY[req.admin.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return next(
        new AppError(
          `Access forbidden. Requires [${minimumRole}] role or higher. Current role: [${req.admin.role}].`,
          403,
          'FORBIDDEN_INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
}
