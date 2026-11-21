/**
 * AegisLoom Security Lab — Authentication Validation Schemas
 */

import { z } from 'zod';

export const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(64),
    password: z.string().min(8).max(128),
    mfaCode: z.string().length(6).optional()
  })
});

export const adminMfaVerifySchema = z.object({
  body: z.object({
    mfaCode: z.string().length(6, 'MFA code must be exactly 6 digits'),
    tempToken: z.string().min(10, 'Temporary session token required')
  })
});

export const adminRefreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

export const createAdminUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric, hyphen, or underscore'),
    email: z.string().email(),
    password: z.string().min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: z.enum(['super_admin', 'training_manager', 'analyst']).default('analyst')
  })
});
