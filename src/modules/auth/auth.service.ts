/**
 * AegisLoom Security Lab — Administrator Authentication Service
 * Secure password hashing, MFA enforcement, account lockout, and audit trails.
 */

import bcrypt from 'bcryptjs';
import { pool, getPostgresStatus } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminRefreshToken,
  AdminTokenPayload
} from '../../utils/token';
import { generateTotpSecret, generateTotpUri, verifyTotpCode } from '../../utils/totp';
import { logAuditEvent } from '../../utils/auditLogger';
import { recordIpSecurityFailure } from '../../middleware/rateLimiter';
import { env } from '../../config/env';

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'training_manager' | 'analyst';
  mfaEnabled: boolean;
  mfaSecret?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
}

// In-memory admin store fallback when PostgreSQL is offline or in unit tests
export const memoryAdminUsers: AdminUserRecord[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    username: 'aegis_secops',
    email: 'admin@aegisloom-training.internal',
    // Precomputed bcrypt hash for 'AegisLoom#Admin2026!Secure'
    passwordHash: '$2a$10$wK1Wk9eX4YgScU6d8a3SiuKk3q1Xj0u7tH/Q5Fv8X7Z2v8K5m9L8C',
    role: 'super_admin',
    mfaEnabled: false,
    failedLoginAttempts: 0
  }
];

export async function findAdminByUsername(username: string): Promise<AdminUserRecord | null> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, username, email, password_hash as "passwordHash", role, 
              mfa_enabled as "mfaEnabled", mfa_secret as "mfaSecret",
              failed_login_attempts as "failedLoginAttempts", locked_until as "lockedUntil"
       FROM admin_users WHERE username = $1`,
      [username]
    );
    return res.rows[0] || null;
  }

  return memoryAdminUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function findAdminById(id: string): Promise<AdminUserRecord | null> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, username, email, password_hash as "passwordHash", role, 
              mfa_enabled as "mfaEnabled", mfa_secret as "mfaSecret",
              failed_login_attempts as "failedLoginAttempts", locked_until as "lockedUntil"
       FROM admin_users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  return memoryAdminUsers.find(u => u.id === id) || null;
}

/**
 * Administrator Login with Account Lockout & Optional MFA Verification
 */
export async function authenticateAdmin(
  username: string,
  passPlain: string,
  mfaCode?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  requireMfa?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: { id: string; username: string; role: string; email: string };
}> {
  const admin = await findAdminByUsername(username);

  if (!admin) {
    // Constant-time dummy bcrypt check prevents user enumeration attacks
    await bcrypt.compare(passPlain, '$2a$10$wK1Wk9eX4YgScU6d8a3SiuKk3q1Xj0u7tH/Q5Fv8X7Z2v8K5m9L8C');
    if (ipAddress) recordIpSecurityFailure(ipAddress);
    await logAuditEvent({
      adminUsername: username,
      action: 'ADMIN_LOGIN_FAILED_UNKNOWN_USER',
      resourceType: 'auth',
      ipAddress,
      userAgent
    });
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  // Check Account Lockout
  if (admin.lockedUntil && new Date() < new Date(admin.lockedUntil)) {
    const remainingMinutes = Math.ceil((new Date(admin.lockedUntil).getTime() - Date.now()) / 60000);
    throw new AppError(
      `Account locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s).`,
      423,
      'ACCOUNT_LOCKED'
    );
  }

  // Verify Password with bcrypt
  const isValidPassword = await bcrypt.compare(passPlain, admin.passwordHash);

  if (!isValidPassword) {
    if (ipAddress) recordIpSecurityFailure(ipAddress);
    admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
    let locked = false;

    if (admin.failedLoginAttempts >= 5) {
      admin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      locked = true;
    }

    if (getPostgresStatus()) {
      await pool.query(
        `UPDATE admin_users 
         SET failed_login_attempts = $1, locked_until = $2 
         WHERE id = $3`,
        [admin.failedLoginAttempts, admin.lockedUntil || null, admin.id]
      );
    }

    await logAuditEvent({
      adminId: admin.id,
      adminUsername: admin.username,
      action: locked ? 'ADMIN_ACCOUNT_LOCKED' : 'ADMIN_LOGIN_FAILED_PASSWORD',
      resourceType: 'auth',
      ipAddress,
      userAgent,
      details: { failedAttempts: admin.failedLoginAttempts }
    });

    throw new AppError(
      locked ? 'Account locked due to excessive failed attempts. Try again in 15 minutes.' : 'Invalid credentials.',
      locked ? 423 : 401,
      locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS'
    );
  }

  // Reset Failed Login Attempts on successful password
  admin.failedLoginAttempts = 0;
  admin.lockedUntil = null;
  if (getPostgresStatus()) {
    await pool.query(
      `UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [admin.id]
    );
  }

  // Handle Multi-Factor Authentication
  if (admin.mfaEnabled) {
    if (!mfaCode) {
      // Issue short-lived temporary token for step-up MFA challenge
      const tempToken = generateAdminAccessToken({
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        mfaVerified: false
      });

      return {
        requireMfa: true,
        tempToken
      };
    }

    // Verify provided MFA code
    if (!admin.mfaSecret || !verifyTotpCode(mfaCode, admin.mfaSecret)) {
      await logAuditEvent({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'ADMIN_MFA_FAILED',
        resourceType: 'auth',
        ipAddress,
        userAgent
      });
      throw new AppError('Invalid MFA token. Verification failed.', 401, 'INVALID_MFA');
    }
  }

  // Issue Access & Refresh Tokens
  const tokenPayload: AdminTokenPayload = {
    adminId: admin.id,
    username: admin.username,
    role: admin.role,
    mfaVerified: true
  };

  const accessToken = generateAdminAccessToken(tokenPayload);
  const refreshToken = generateAdminRefreshToken(admin.id);

  await logAuditEvent({
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'ADMIN_LOGIN_SUCCESS',
    resourceType: 'auth',
    ipAddress,
    userAgent
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    }
  };
}

/**
 * Setup Multi-Factor Authentication: Generates secret & QR code URI
 */
export async function setupMfa(adminId: string): Promise<{ secret: string; otpauthUri: string }> {
  const admin = await findAdminById(adminId);
  if (!admin) throw new AppError('Administrator not found.', 404, 'NOT_FOUND');

  const secret = generateTotpSecret();
  const otpauthUri = generateTotpUri(admin.username, secret, env.MFA_APP_NAME);

  // Temporarily store secret until verified
  admin.mfaSecret = secret;

  if (getPostgresStatus()) {
    await pool.query(
      'UPDATE admin_users SET mfa_secret = $1 WHERE id = $2',
      [secret, adminId]
    );
  }

  return { secret, otpauthUri };
}

/**
 * Confirm and activate MFA with initial token check
 */
export async function confirmMfaActivation(adminId: string, token: string): Promise<boolean> {
  const admin = await findAdminById(adminId);
  if (!admin || !admin.mfaSecret) {
    throw new AppError('MFA setup was not initiated.', 400, 'MFA_NOT_INITIATED');
  }

  const isValid = verifyTotpCode(token, admin.mfaSecret);
  if (!isValid) {
    throw new AppError('Invalid MFA verification code.', 400, 'INVALID_MFA');
  }

  admin.mfaEnabled = true;

  if (getPostgresStatus()) {
    await pool.query(
      'UPDATE admin_users SET mfa_enabled = TRUE WHERE id = $1',
      [adminId]
    );
  }

  await logAuditEvent({
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'ADMIN_MFA_ACTIVATED',
    resourceType: 'auth'
  });

  return true;
}

/**
 * Refresh Access Token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const decoded = verifyAdminRefreshToken(refreshToken);
  const admin = await findAdminById(decoded.adminId);

  if (!admin) {
    throw new AppError('Session user no longer exists.', 401, 'USER_NOT_FOUND');
  }

  return generateAdminAccessToken({
    adminId: admin.id,
    username: admin.username,
    role: admin.role,
    mfaVerified: true
  });
}
