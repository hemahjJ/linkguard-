/**
 * AegisLoom Security Lab — Simulation Interception Controller
 */

import { Request, Response, NextFunction } from 'express';
import { processLoginInterception, processPhishReport } from './simulation.service';

export async function handleLoginInterception(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Intentionally discard req.body entirely — never inspect or store credentials
    const scenarioId = (req.query.scenarioId as string) || (req.body?.scenarioId as string);
    const result = await processLoginInterception(scenarioId);

    // Set clear simulation defense response header
    res.setHeader('X-Simulation-Warning', 'Simulated-Trap-Intercepted-Safely');
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleReportPhish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scenarioId, anonymousLearnerId } = req.body || {};
    const result = await processPhishReport(scenarioId, anonymousLearnerId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export function getRiskScoreGuide(req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    framework: 'AegisLoom Cyber Threat Scoring Model',
    riskLevels: [
      {
        level: 'LOW (0 - 25%)',
        description: 'Standard benign corporate communication. Verified SPF/DKIM/DMARC headers. No urgency manipulation.',
        action: 'Standard handling.'
      },
      {
        level: 'ELEVATED (26 - 50%)',
        description: 'Unusual sender address or generic greeting detected. Needs verification before interacting with links.',
        action: 'Inspect email headers and contact sender out-of-band.'
      },
      {
        level: 'HIGH (51 - 75%)',
        description: 'High pressure countdown deadline, mismatched anchor text, or unverified single-sign-on link.',
        action: 'Do not click links or open attachments. Report via PhishAlarm.'
      },
      {
        level: 'CRITICAL (76 - 100%)',
        description: 'Double extension executable (.scr.pdf), typosquatted domain, or direct credential harvesting portal trap.',
        action: 'Immediate isolation and SOC quarantine.'
      }
    ],
    redFlagChecklist: [
      { id: 'flag_sender', title: 'Sender Domain Lookalike', weight: 25 },
      { id: 'flag_urgency', title: 'Manufactured Urgency & Coercive Deadline', weight: 20 },
      { id: 'flag_mismatch', title: 'Visible Link Anchor Discrepancy', weight: 25 },
      { id: 'flag_attachment', title: 'Disguised Executable (.scr / .exe in .pdf)', weight: 20 },
      { id: 'flag_greeting', title: 'Generic Impersonal Tokenized Greeting', weight: 10 }
    ]
  });
}
