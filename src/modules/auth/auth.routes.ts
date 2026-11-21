/**
 * AegisLoom Security Lab — Authentication Routes
 */

import { Router } from 'express';
import {
  loginAdminHandler,
  setupMfaHandler,
  confirmMfaHandler,
  refreshTokenHandler,
  getCurrentAdminHandler
} from './auth.controller';
import { validate } from '../../middleware/validation';
import {
  adminLoginSchema,
  adminMfaVerifySchema,
  adminRefreshTokenSchema
} from './auth.schemas';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { requireAdminAuth } from '../../middleware/auth';
import { noCache } from '../../middleware/securityHeaders';

const router = Router();

// Administrator Login (Throttled by strict auth rate limiter)
router.post('/login', authRateLimiter, noCache, validate(adminLoginSchema), loginAdminHandler);

// Refresh Access Token
router.post('/refresh', noCache, validate(adminRefreshTokenSchema), refreshTokenHandler);

// Protected Admin Auth Endpoints
router.get('/me', requireAdminAuth, noCache, getCurrentAdminHandler);
router.post('/mfa/setup', requireAdminAuth, noCache, setupMfaHandler);
router.post('/mfa/confirm', requireAdminAuth, noCache, validate(adminMfaVerifySchema), confirmMfaHandler);

export const authRouter = router;
