/**
 * AegisLoom Security Lab — Administrator Audit Logger
 * Records administrative access, changes, and exports for non-repudiation and compliance.
 */

import { pool, getPostgresStatus } from '../config/database';
import { logger } from './logger';

export interface AuditLogEntry {
  adminId?: string;
  adminUsername: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

// In-memory audit log store for testing / offline mode
export const memoryAuditLogs: (AuditLogEntry & { id: string; createdAt: string })[] = [];

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  logger.info(`AUDIT: [${entry.action}] by ${entry.adminUsername}`, {
    resource: entry.resourceType,
    resourceId: entry.resourceId
  });

  if (getPostgresStatus()) {
    try {
      await pool.query(
        `INSERT INTO audit_logs 
          (admin_id, admin_username, action, resource_type, resource_id, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.adminId || null,
          entry.adminUsername,
          entry.action,
          entry.resourceType,
          entry.resourceId || null,
          entry.ipAddress || null,
          entry.userAgent || null,
          JSON.stringify(entry.details || {})
        ]
      );
    } catch (err) {
      logger.error('Failed to write audit log to PostgreSQL', { error: (err as Error).message });
    }
  } else {
    memoryAuditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: timestamp,
      ...entry
    });
  }
}
