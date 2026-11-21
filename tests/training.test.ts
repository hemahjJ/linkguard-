/**
 * AegisLoom Security Lab — Training & Certificate Unit Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app';

describe('Training & Certificate API', () => {
  it('should list active training modules', async () => {
    const res = await request(app).get('/api/v1/training/modules');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  it('should fetch module details and published scenarios', async () => {
    const res = await request(app).get('/api/v1/training/modules/mod-email-phish');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.module.id, 'mod-email-phish');
    assert.ok(Array.isArray(res.body.scenarios));
  });

  it('should get safe quiz questions and mask answers', async () => {
    const res = await request(app).get('/api/v1/training/quizzes/mod-email-phish');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.questions.length >= 1);

    // Crucial check: is_correct must NOT be present in options returned to client
    for (const q of res.body.questions) {
      for (const opt of q.options) {
        assert.strictEqual(opt.is_correct, undefined, 'is_correct must be masked from public questions endpoint');
      }
    }
  });

  it('should evaluate quiz answers and generate verifiable certificate upon passing', async () => {
    const res = await request(app)
      .post('/api/v1/training/quizzes/mod-email-phish/evaluate')
      .send({
        anonymousLearnerId: 'learner-anon-8822-test',
        answers: {
          'q-101': 'b', // correct
          'q-102': 'b'  // correct
        }
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.result.isPassed, true);
    assert.strictEqual(res.body.result.scorePercentage, 100);
    assert.ok(res.body.result.certificate);
    assert.ok(res.body.result.certificate.certificateId);

    // Verify certificate download endpoint in SVG format
    const certRes = await request(app)
      .get(`/api/v1/training/certificate/${res.body.result.certificate.certificateId}?format=svg`);

    assert.strictEqual(certRes.status, 200);
    const contentType = certRes.header['content-type'] || certRes.headers['content-type'] || '';
    assert.ok(contentType.includes('image/svg+xml'), `Expected content-type to include image/svg+xml, got ${contentType}`);
    const svgContent = certRes.text || (certRes.body ? certRes.body.toString('utf8') : '');
    assert.ok(svgContent.includes('<svg'));
    assert.ok(svgContent.includes('AEGISLOOM SECURITY LAB'));
  });
});
