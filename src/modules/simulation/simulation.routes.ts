/**
 * AegisLoom Security Lab — Simulation Routes
 */

import { Router } from 'express';
import { handleLoginInterception, handleReportPhish, getRiskScoreGuide } from './simulation.controller';
import { simulationRateLimiter } from '../../middleware/rateLimiter';
import { noCache } from '../../middleware/securityHeaders';

const router = Router();

// Trap endpoint: Intercepts simulated login forms (GET & POST supported for form redirects)
router.all('/login-intercept', simulationRateLimiter, noCache, handleLoginInterception);

// Simulated SOC reporting button
router.post('/report-phish', simulationRateLimiter, noCache, handleReportPhish);

// Risk score educational guide
router.get('/risk-score-guide', getRiskScoreGuide);

export const simulationRouter = router;
