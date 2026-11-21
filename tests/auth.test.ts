/**
 * AegisLoom Security Lab — Administrator Authentication Unit Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';

describe('Administrator Authentication API', () => {
  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'aegis_secops',
        password: 'WrongPassword999!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('should reject login for non-existent admin user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'ghost_user',
        password: 'Password123!Valid'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('should reject malformed input via Zod validation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'ab', // too short (< 3)
        password: '123'  // too short (< 8)
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.length >= 2);
  });

  it('should protect /api/v1/auth/me when token is missing', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });
});
