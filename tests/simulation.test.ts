/**
 * AegisLoom Security Lab — Simulation Interception Unit Tests
 * Strictly verifies zero credential capture and fixed educational response.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';

describe('Simulation Interception API', () => {
  it('should return fixed educational notice and discard any simulated credential payload', async () => {
    // Attempt sending dummy login credentials
    const response = await request(app)
      .post('/api/v1/simulation/login-intercept')
      .send({
        username: 'victim.user@kestreldynamics-corp.internal',
        password: 'RealPassword123!DoNotLog',
        otpPin: '123456'
      });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.isEducationalSimulation, true);
    assert.strictEqual(
      response.body.message,
      'This was a training simulation. Never enter credentials on unverified websites.'
    );

    // Verify response contains educational threat analysis
    assert.ok(response.body.threatAnalysis);
    assert.ok(response.body.threatAnalysis.indicatorsDetected.length > 0);

    // Verify custom educational simulation header
    assert.strictEqual(response.headers['x-simulation-warning'], 'Simulated-Trap-Intercepted-Safely');
  });

  it('should accept phish reporting with positive reinforcement', async () => {
    const response = await request(app)
      .post('/api/v1/simulation/report-phish')
      .send({
        scenarioId: 'scen-auragrid-sso',
        anonymousLearnerId: 'anon-test-learner-9988'
      });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.socTelemetry.status, 'QUARANTINED');
  });

  it('should return the live risk-score framework guide', async () => {
    const response = await request(app)
      .get('/api/v1/simulation/risk-score-guide');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.riskLevels.length >= 4);
    assert.ok(response.body.redFlagChecklist.length >= 5);
  });
});
