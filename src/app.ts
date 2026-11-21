/**
 * AegisLoom Security Lab — Express Application Setup
 * Hardened middleware pipeline, security headers, CORS allowlist, and route registration.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { securityHeaders, enforceHttps, requestIdMiddleware, permissionsPolicy } from './middleware/securityHeaders';
import { generalRateLimiter, checkIpReputation } from './middleware/rateLimiter';
import { sanitizeInputs } from './middleware/sanitize';
import { verifyOriginCsrf } from './middleware/csrfProtection';
import { errorHandler, AppError } from './middleware/errorHandler';

// Route Handlers
import { authRouter } from './modules/auth/auth.routes';
import { simulationRouter } from './modules/simulation/simulation.routes';
import { trainingRouter } from './modules/training/training.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { linkScannerRouter } from './modules/link-scanner/linkScanner.routes';
import { monitorRouter } from './modules/monitor/monitor.routes';
import { monitorRequests } from './modules/monitor/monitor.service';
import { getPostgresStatus } from './config/database';

export const app = express();

// 1. HTTPS Enforcement, Hardened Security Headers & Permissions Policy
app.use(enforceHttps);
app.use(securityHeaders);
app.use(permissionsPolicy);
app.use(requestIdMiddleware);
app.use(monitorRequests);

// 2. IP Reputation / Brute-Force Check
app.use(checkIpReputation);

// 3. CORS Allowlist Configuration
const allowedOrigins = env.CORS_ORIGIN.split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser agents (cURL, mobile apps, health probes) or exact matches
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError(`CORS policy violation: Origin [${origin}] not permitted.`, 403, 'CORS_DISALLOWED'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Admin-Token']
}));

// 4. Body Parsing with Strict Size Limit (Mitigates payload exhaustion DoS)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// 5. Anti-Injection & Prototype Pollution Sanitization
app.use(sanitizeInputs);

// 6. CSRF & Origin Verification on Mutating Endpoints
app.use(verifyOriginCsrf);

// 7. Rate Limiting for Public Endpoints
app.use('/api', generalRateLimiter);

// 8. Health Check & Diagnostics Endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'AegisLoom Security Lab Backend',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    postgresConnected: getPostgresStatus(),
    privacyCharter: {
      credentialCollection: 'DISABLED_BY_DESIGN',
      simulationMode: 'ACTIVE',
      dataRetention: 'MINIMUM_ANONYMOUS_METADATA_ONLY'
    }
  });
});

// Determine project root directory robustly (supports tsx dev & compiled dist)
const projectRootDir = process.cwd();

// 9. OpenAPI Documentation Endpoint
app.get('/api/docs', (req: Request, res: Response) => {
  const docsPath = path.join(projectRootDir, 'docs', 'openapi.json');
  res.sendFile(docsPath, (err) => {
    if (err) {
      res.status(200).json({
        message: 'AegisLoom Security Lab API Specification',
        version: '1.0.0',
        baseUrl: '/api/v1',
        endpoints: [
          '/api/v1/simulation/login-intercept (POST)',
          '/api/v1/simulation/report-phish (POST)',
          '/api/v1/simulation/risk-score-guide (GET)',
          '/api/v1/training/modules (GET)',
          '/api/v1/training/quizzes/:moduleId (GET)',
          '/api/v1/training/quizzes/:moduleId/evaluate (POST)',
          '/api/v1/training/certificate/:completionId (GET)',
          '/api/v1/auth/login (POST)',
          '/api/v1/admin/scenarios (POST)',
          '/api/v1/admin/analytics/completion (GET)',
          '/api/v1/admin/analytics/export (GET)'
        ]
      });
    }
  });
});

// 10. Serve Static Training Simulation Frontend
app.use(express.static(projectRootDir));

// 11. Mount Core API Routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/simulation', simulationRouter);
app.use('/api/v1/training', trainingRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/link-check', linkScannerRouter);
app.use('/api/v1/monitor', monitorRouter);

// 12. 404 Route Catch-All
app.use('/api/*', (req: Request, res: Response, next) => {
  next(new AppError(`API route not found: [${req.method}] ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

// 13. Centralized Error Handling
app.use(errorHandler);
