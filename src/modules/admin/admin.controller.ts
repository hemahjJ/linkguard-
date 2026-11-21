/**
 * AegisLoom Security Lab — Administrator Dashboard Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  createScenario,
  updateScenario,
  toggleScenarioPublish,
  getAggregateCompletionData,
  exportAnonymizedReport,
  getAuditLogs
} from './admin.service';

export async function createScenarioHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.admin!.adminId;
    const adminUsername = req.admin!.username;
    const scenario = await createScenario(req.body, adminId, adminUsername);

    res.status(201).json({
      success: true,
      message: 'Fictional phishing scenario created successfully.',
      scenario
    });
  } catch (err) {
    next(err);
  }
}

export async function updateScenarioHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.admin!.adminId;
    const adminUsername = req.admin!.username;
    const scenarioId = req.params.id as string;
    const scenario = await updateScenario(scenarioId, req.body, adminId, adminUsername);

    res.status(200).json({
      success: true,
      message: 'Fictional phishing scenario updated successfully.',
      scenario
    });
  } catch (err) {
    next(err);
  }
}

export async function publishScenarioHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.admin!.adminId;
    const adminUsername = req.admin!.username;
    const scenarioId = req.params.id as string;
    const isPublished = req.body.isPublished !== false;

    const result = await toggleScenarioPublish(scenarioId, isPublished, adminId, adminUsername);

    res.status(200).json({
      success: true,
      message: `Scenario ${isPublished ? 'published' : 'unpublished'} successfully.`,
      result
    });
  } catch (err) {
    next(err);
  }
}

export async function getAnalyticsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analytics = await getAggregateCompletionData();
    res.status(200).json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
}

export async function exportAnalyticsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const moduleId = req.query.moduleId as string | undefined;

    const report = await exportAnonymizedReport(format, moduleId);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);

    if (format === 'csv') {
      res.send(report.data);
    } else {
      res.json(report.data);
    }
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs = await getAuditLogs(limit);
    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err) {
    next(err);
  }
}
