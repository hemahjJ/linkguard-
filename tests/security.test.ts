/**
 * AegisLoom Security Lab — Security Hardening & Headers Unit Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';

describe('Security Hardening & Diagnostic Health API', () => {
  it('should expose a live monitor status snapshot', async () => {
    const res = await request(app).get('/api/v1/monitor/status');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'online');
    assert.strictEqual(Array.isArray(res.body.recentEvents), true);
    assert.strictEqual(Array.isArray(res.body.activity), true);
    assert.strictEqual(res.body.activity.length, 12);
    assert.strictEqual(typeof res.body.summary.suspiciousPercent, 'number');
    assert.ok(['up', 'down', 'stable'].includes(res.body.summary.trend));
  });

  it('should return health diagnostic with explicit privacy charter confirmation', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.privacyCharter.credentialCollection, 'DISABLED_BY_DESIGN');
    assert.strictEqual(res.body.privacyCharter.simulationMode, 'ACTIVE');
  });

  it('should include hardened HTTP security headers and simulation notice', async () => {
    const res = await request(app).get('/api/v1/health');

    // Helmet security headers
    assert.ok(res.headers['x-content-type-options']);
    assert.ok(res.headers['x-frame-options']);
    assert.ok(res.headers['content-security-policy']);
    assert.ok(res.headers['permissions-policy']);

    // Unique Request ID correlation
    assert.ok(res.headers['x-request-id']);

    // AegisLoom Simulation Notice Header
    assert.strictEqual(res.headers['x-simulation-notice'], 'AegisLoom-Authorized-Training-Only');
  });

  it('should prevent caching on simulation endpoints', async () => {
    const res = await request(app).post('/api/v1/simulation/login-intercept');

    assert.ok(res.headers['cache-control'].includes('no-store'));
    assert.ok(res.headers['cache-control'].includes('no-cache'));
  });

  it('should block prototype pollution payload attempts', async () => {
    const res = await request(app)
      .post('/api/v1/simulation/login-intercept')
      .set('Content-Type', 'application/json')
      .send('{"__proto__": {"isAdmin": true}}');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'SECURITY_VIOLATION');
  });

  it('should block null-byte injection attempts', async () => {
    const res = await request(app)
      .post('/api/v1/simulation/login-intercept')
      .send({ scenarioId: 'scen-test\0malicious' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'SECURITY_VIOLATION');
  });

  it('should return 404 with structured error response for non-existent endpoints', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });
});
