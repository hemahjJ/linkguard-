/**
 * AegisLoom Security Lab — JWT Token Utilities
 * Cryptographic token generation and verification for administrator sessions.
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminTokenPayload {
  adminId: string;
  username: string;
  role: 'super_admin' | 'training_manager' | 'analyst';
  mfaVerified: boolean;
}

export function generateAdminAccessToken(payload: AdminTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
    issuer: 'aegisloom-security-lab',
    audience: 'aegisloom-admin'
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function generateAdminRefreshToken(adminId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    issuer: 'aegisloom-security-lab'
  };
  return jwt.sign({ adminId, type: 'refresh' }, env.JWT_REFRESH_SECRET, options);
}

export function verifyAdminAccessToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'aegisloom-security-lab',
    audience: 'aegisloom-admin'
  }) as AdminTokenPayload;
}

export function verifyAdminRefreshToken(token: string): { adminId: string; type: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'aegisloom-security-lab'
  }) as { adminId: string; type: string };
}
