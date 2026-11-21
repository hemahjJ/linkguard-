/**
 * AegisLoom Security Lab — Administrator Dashboard Routes
 * Protected endpoints with Role-Based Access Control (RBAC).
 */

import { Router } from 'express';
import {
  createScenarioHandler,
  updateScenarioHandler,
  publishScenarioHandler,
  getAnalyticsHandler,
  exportAnalyticsHandler,
  getAuditLogsHandler
} from './admin.controller';
import { requireAdminAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validation';
import {
  createScenarioSchema,
  updateScenarioSchema,
  exportAnalyticsSchema
} from './admin.schemas';
import { noCache } from '../../middleware/securityHeaders';

const router = Router();

// Apply admin authentication and anti-caching to all admin routes
router.use(requireAdminAuth);
router.use(noCache);

// Scenario Authoring (Requires 'training_manager' or 'super_admin')
router.post(
  '/scenarios',
  requireRole('training_manager'),
  validate(createScenarioSchema),
  createScenarioHandler
);

router.put(
  '/scenarios/:id',
  requireRole('training_manager'),
  validate(updateScenarioSchema),
  updateScenarioHandler
);

router.patch(
  '/scenarios/:id/publish',
  requireRole('training_manager'),
  publishScenarioHandler
);

// Analytics & Completion Oversight (Accessible by 'analyst', 'training_manager', 'super_admin')
router.get('/analytics/completion', requireRole('analyst'), getAnalyticsHandler);
router.get(
  '/analytics/export',
  requireRole('analyst'),
  validate(exportAnalyticsSchema),
  exportAnalyticsHandler
);

// Audit Logs Review (Requires 'super_admin')
router.get('/audit-logs', requireRole('super_admin'), getAuditLogsHandler);

export const adminRouter = router;
