/**
 * AegisLoom Security Lab — Training Routes
 */

import { Router } from 'express';
import {
  getModulesHandler,
  getModuleDetailsHandler,
  getScenarioDetailsHandler,
  getQuizQuestionsHandler,
  submitQuizEvaluationHandler,
  getCertificateHandler,
  verifyCertificateHandler
} from './training.controller';
import { validate } from '../../middleware/validation';
import { evaluateQuizSchema, getCertificateSchema } from './training.schemas';
import { noCache } from '../../middleware/securityHeaders';

const router = Router();

// Public Training Modules & Scenarios
router.get('/modules', getModulesHandler);
router.get('/modules/:id', getModuleDetailsHandler);
router.get('/scenarios/:id', getScenarioDetailsHandler);

// Public Safe Quiz
router.get('/quizzes/:moduleId', noCache, getQuizQuestionsHandler);
router.post('/quizzes/:moduleId/evaluate', noCache, validate(evaluateQuizSchema), submitQuizEvaluationHandler);

// Public Verifiable Certificates
router.get('/certificate/:completionId', validate(getCertificateSchema), getCertificateHandler);
router.get('/verify-certificate/:certificateId', verifyCertificateHandler);

export const trainingRouter = router;
