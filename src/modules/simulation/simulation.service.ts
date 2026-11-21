/**
 * AegisLoom Security Lab — Simulation Interception Service
 * STRICT SAFETY CHARTER: Discards all submitted form data. Never persists credentials.
 */

import { pool, getPostgresStatus } from '../../config/database';
import { logger } from '../../utils/logger';

export interface InterceptionResult {
  message: string;
  isEducationalSimulation: true;
  safetyNotice: string;
  threatAnalysis: {
    attackVector: string;
    targetFictionalDomain: string;
    legitimateDomainComparison: string;
    indicatorsDetected: string[];
    immediateSafeAction: string;
  };
}

// In-memory counter for aggregate telemetry when running without PostgreSQL
let memoryInterceptionCount = 0;
let memoryReportCount = 0;

export async function processLoginInterception(scenarioId?: string): Promise<InterceptionResult> {
  // STRICT DATA DISCARD: No request body parameters are accepted, inspected, or saved.
  logger.info('Simulated credential trap triggered. Form-field payload safely discarded.');

  if (getPostgresStatus()) {
    try {
      await pool.query(
        `INSERT INTO simulation_interceptions (scenario_id, interaction_type)
         VALUES ($1, 'form_interception')`,
        [scenarioId || null]
      );
    } catch (err) {
      logger.error('Failed to log interception counter in PostgreSQL', { error: (err as Error).message });
    }
  } else {
    memoryInterceptionCount++;
  }

  return {
    message: 'This was a training simulation. Never enter credentials on unverified websites.',
    isEducationalSimulation: true,
    safetyNotice: 'AegisLoom Security Lab intercepted this simulated request. Zero passwords, tokens, or personal identifiers were collected, stored, or transmitted.',
    threatAnalysis: {
      attackVector: 'Credential Harvesting via Lookalike SSO Landing Page',
      targetFictionalDomain: 'auragrid-verify-sso-portal.net',
      legitimateDomainComparison: 'Official corporate authentication resides at "auragrid.io" or internal SSO bookmarks.',
      indicatorsDetected: [
        'Untrusted Domain: Hyphenated lookalike domain mimicking legitimate provider',
        'Deceptive Anchor: Hyperlink text did not match actual browser target',
        'Coercive Urgency: Artificial countdown clock pressuring immediate action',
        'Zero Enterprise SSO Protocol: Authentic enterprise SSO uses SAML/OIDC federated redirects, never ad-hoc email login forms'
      ],
      immediateSafeAction: 'Close the suspicious tab, do not click links in the message, and report the email immediately to your Security Operations Center (SOC).'
    }
  };
}

export async function processPhishReport(
  scenarioId?: string,
  anonymousLearnerId?: string
): Promise<{ success: boolean; message: string; socTelemetry: Record<string, any> }> {
  logger.info(`Simulated phish report submitted for scenario: ${scenarioId || 'general'}`);

  if (getPostgresStatus()) {
    try {
      await pool.query(
        `INSERT INTO simulation_interceptions (scenario_id, interaction_type)
         VALUES ($1, 'phish_reported')`,
        [scenarioId || null]
      );

      if (anonymousLearnerId && scenarioId) {
        await pool.query(
          `INSERT INTO learner_completions (anonymous_learner_id, module_id, scenario_id, status)
           VALUES ($1, 'mod-email-phish', $2, 'phish_reported')
           ON CONFLICT DO NOTHING`,
          [anonymousLearnerId, scenarioId]
        );
      }
    } catch (err) {
      logger.error('Failed to record phish report in PostgreSQL', { error: (err as Error).message });
    }
  } else {
    memoryReportCount++;
  }

  return {
    success: true,
    message: 'Simulated phishing email successfully reported to AegisLoom SOC. Threat neutralized.',
    socTelemetry: {
      status: 'QUARANTINED',
      actionTaken: 'Message purged from all corporate inboxes across fictional tenant',
      perimeterDefense: 'Attacking host added to enterprise edge firewall blocklist',
      userReward: 'Cyber Sentinel Badge awarded (+100 Defense XP)'
    }
  };
}

export function getInterceptionMetrics() {
  return {
    totalInterceptions: memoryInterceptionCount,
    totalReports: memoryReportCount
  };
}
