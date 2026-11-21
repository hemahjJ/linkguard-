/**
 * AegisLoom Security Lab — Training Module Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  getAllModules,
  getModuleById,
  getScenariosForModule,
  getScenarioById,
  getSafeQuizQuestions,
  evaluateQuizSubmission,
  getCertificate
} from './training.service';

export async function getModulesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const modules = await getAllModules();
    res.status(200).json({ success: true, count: modules.length, data: modules });
  } catch (err) {
    next(err);
  }
}

export async function getModuleDetailsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const moduleId = req.params.id as string;
    const module = await getModuleById(moduleId);
    const scenarios = await getScenariosForModule(module.id);
    res.status(200).json({ success: true, module, scenarios });
  } catch (err) {
    next(err);
  }
}

export async function getScenarioDetailsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scenarioId = req.params.id as string;
    const scenario = await getScenarioById(scenarioId);
    res.status(200).json({ success: true, scenario });
  } catch (err) {
    next(err);
  }
}

export async function getQuizQuestionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const moduleId = req.params.moduleId as string;
    const questions = await getSafeQuizQuestions(moduleId);
    res.status(200).json({ success: true, count: questions.length, questions });
  } catch (err) {
    next(err);
  }
}

export async function submitQuizEvaluationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const moduleId = req.params.moduleId as string;
    const { anonymousLearnerId, answers } = req.body;

    const result = await evaluateQuizSubmission(moduleId, anonymousLearnerId, answers);
    res.status(200).json({ success: true, result });
  } catch (err) {
    next(err);
  }
}

export async function getCertificateHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const completionId = req.params.completionId as string;
    const format = (req.query.format as 'json' | 'svg') || 'json';

    const certResult = await getCertificate(completionId, format);

    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `inline; filename="AegisLoom-Certificate-${completionId}.svg"`);
      res.send(certResult.data);
      return;
    }

    res.status(200).json({ success: true, certificate: certResult.data });
  } catch (err) {
    next(err);
  }
}

export async function verifyCertificateHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const certificateId = req.params.certificateId as string;
    const certResult = await getCertificate(certificateId, 'json');

    res.status(200).json({
      success: true,
      verified: true,
      issuingAuthority: 'AegisLoom Security Lab',
      certificate: certResult.data
    });
  } catch (err) {
    next(err);
  }
}
