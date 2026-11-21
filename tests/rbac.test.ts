/**
 * AegisLoom Security Lab — Role-Based Access Control (RBAC) Unit Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';
import { generateAdminAccessToken } from '../src/utils/token';

describe('Admin RBAC & Protected Endpoints API', () => {
  const analystToken = generateAdminAccessToken({
    adminId: 'analyst-id-1',
    username: 'sec_analyst_01',
    role: 'analyst',
    mfaVerified: true
  });

  const managerToken = generateAdminAccessToken({
    adminId: 'manager-id-1',
    username: 'training_mgr_01',
    role: 'training_manager',
    mfaVerified: true
  });

  const superAdminToken = generateAdminAccessToken({
    adminId: 'super-admin-id-1',
    username: 'ciso_admin',
    role: 'super_admin',
    mfaVerified: true
  });

  it('should deny unauthenticated requests to admin analytics with 401', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/completion');
    assert.strictEqual(res.status, 401);
  });

  it('should allow analyst to view analytics completion data', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/completion')
      .set('Authorization', `Bearer ${analystToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.analytics.overview);
  });

  it('should forbid analyst from creating scenarios (403 required training_manager or higher)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/scenarios')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        id: 'scen-unauth-test',
        moduleId: 'mod-email-phish',
        title: 'Unauthorized Test Scenario',
        fictionalSenderName: 'Attacker Fake',
        fictionalSenderEmail: 'fake@fake-domain.cc',
        fictionalRecipient: 'target@corp.internal',
        subject: 'Fake Subject',
        bodyHtml: '<p>Test</p>'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN_INSUFFICIENT_ROLE');
  });

  it('should allow training_manager to create fictional scenarios', async () => {
    const res = await request(app)
      .post('/api/v1/admin/scenarios')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        id: 'scen-manager-test',
        moduleId: 'mod-email-phish',
        title: 'Manager Created Fictional Phishing Scenario',
        fictionalSenderName: 'Fake IT Cloud Support',
        fictionalSenderEmail: 'support@cloud-identity-portal.cc',
        fictionalRecipient: 'alex@kestrel.internal',
        subject: '[SIMULATION] Password Expiration In 1 Hour',
        bodyHtml: '<p>Simulation test content for AegisLoom.</p>',
        warningSignals: [
          { type: 'typosquat', indicator: 'cloud-identity-portal.cc', explanation: 'Lookalike domain' }
        ],
        educationalTakeaways: ['Always verify sender root domain']
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
  });

  it('should allow super_admin to inspect audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.logs));
  });

  it('should export anonymized compliance report in CSV format', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/export?format=csv')
      .set('Authorization', `Bearer ${analystToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(res.text.includes('AnonymousLearnerHash'));
  });
});
