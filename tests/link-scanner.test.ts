import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';

describe('Link Security Checker API', () => {
  it('should return a low-risk heuristic result for a standard public HTTPS URL', async () => {
    const res = await request(app)
      .post('/api/v1/link-check')
      .send({ url: 'https://example.com/docs' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.risk, 'low');
    assert.strictEqual(res.body.hostname, 'example.com');
    assert.strictEqual(res.body.reputation.status, 'not_requested');
  });

  it('should identify several risk signals without fetching the submitted URL', async () => {
    const res = await request(app)
      .post('/api/v1/link-check')
      .send({ url: 'http://192.0.2.1/login/verify-account' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.risk, 'suspicious');
    assert.ok(res.body.signals.some((signal: { title: string }) => signal.title === 'IP address used as host'));
    assert.ok(res.body.signals.some((signal: { title: string }) => signal.title === 'No HTTPS encryption'));
  });

  it('should refuse URLs carrying sensitive tokens before a reputation lookup', async () => {
    const res = await request(app)
      .post('/api/v1/link-check')
      .send({ url: 'https://example.com/reset?token=private-value', allowExternalLookup: true });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'PRIVATE_URL_BLOCKED');
  });
});
