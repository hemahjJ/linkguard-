/**
 * AegisLoom Security Lab — Administrator Dashboard Service
 * Scenario authoring, aggregate training telemetry, anonymized compliance export, and audit trails.
 */

import { pool, getPostgresStatus } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logAuditEvent, memoryAuditLogs } from '../../utils/auditLogger';
import { FictionalScenario } from '../training/training.service';
import { getInterceptionMetrics } from '../simulation/simulation.service';

const memoryAdminScenarios: Record<string, FictionalScenario & { isPublished: boolean; createdBy?: string }> = {};

export async function createScenario(
  scenarioData: FictionalScenario & { isPublished?: boolean },
  adminId: string,
  adminUsername: string
): Promise<FictionalScenario> {
  const isPublished = scenarioData.isPublished ?? true;

  if (getPostgresStatus()) {
    try {
      const res = await pool.query(
        `INSERT INTO scenarios 
          (id, module_id, title, fictional_sender_name, fictional_sender_email, 
           fictional_recipient, subject, body_html, warning_signals, educational_takeaways, 
           is_published, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, module_id as "moduleId", title, fictional_sender_name as "fictionalSenderName",
                   fictional_sender_email as "fictionalSenderEmail", fictional_recipient as "fictionalRecipient",
                   subject, body_html as "bodyHtml", warning_signals as "warningSignals",
                   educational_takeaways as "educationalTakeaways", is_published as "isPublished"`,
        [
          scenarioData.id,
          scenarioData.moduleId,
          scenarioData.title,
          scenarioData.fictionalSenderName,
          scenarioData.fictionalSenderEmail,
          scenarioData.fictionalRecipient,
          scenarioData.subject,
          scenarioData.bodyHtml,
          JSON.stringify(scenarioData.warningSignals || []),
          JSON.stringify(scenarioData.educationalTakeaways || []),
          isPublished,
          adminId
        ]
      );

      await logAuditEvent({
        adminId,
        adminUsername,
        action: 'SCENARIO_CREATED',
        resourceType: 'scenario',
        resourceId: scenarioData.id,
        details: { title: scenarioData.title, moduleId: scenarioData.moduleId }
      });

      return res.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new AppError('Scenario with this ID already exists.', 409, 'DUPLICATE_SCENARIO');
      }
      throw err;
    }
  }

  // Fallback in-memory
  memoryAdminScenarios[scenarioData.id] = {
    ...scenarioData,
    isPublished,
    createdBy: adminId
  };

  await logAuditEvent({
    adminId,
    adminUsername,
    action: 'SCENARIO_CREATED',
    resourceType: 'scenario',
    resourceId: scenarioData.id
  });

  return memoryAdminScenarios[scenarioData.id];
}

export async function updateScenario(
  scenarioId: string,
  updates: Partial<FictionalScenario & { isPublished: boolean }>,
  adminId: string,
  adminUsername: string
): Promise<FictionalScenario> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `UPDATE scenarios 
       SET title = COALESCE($1, title),
           fictional_sender_name = COALESCE($2, fictional_sender_name),
           fictional_sender_email = COALESCE($3, fictional_sender_email),
           fictional_recipient = COALESCE($4, fictional_recipient),
           subject = COALESCE($5, subject),
           body_html = COALESCE($6, body_html),
           is_published = COALESCE($7, is_published),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, module_id as "moduleId", title, fictional_sender_name as "fictionalSenderName",
                 fictional_sender_email as "fictionalSenderEmail", fictional_recipient as "fictionalRecipient",
                 subject, body_html as "bodyHtml", warning_signals as "warningSignals",
                 educational_takeaways as "educationalTakeaways", is_published as "isPublished"`,
      [
        updates.title || null,
        updates.fictionalSenderName || null,
        updates.fictionalSenderEmail || null,
        updates.fictionalRecipient || null,
        updates.subject || null,
        updates.bodyHtml || null,
        updates.isPublished !== undefined ? updates.isPublished : null,
        scenarioId
      ]
    );

    if (!res.rows[0]) throw new AppError('Scenario not found.', 404, 'SCENARIO_NOT_FOUND');

    await logAuditEvent({
      adminId,
      adminUsername,
      action: 'SCENARIO_UPDATED',
      resourceType: 'scenario',
      resourceId: scenarioId
    });

    return res.rows[0];
  }

  const existing = memoryAdminScenarios[scenarioId];
  if (!existing) throw new AppError('Scenario not found.', 404, 'SCENARIO_NOT_FOUND');

  Object.assign(existing, updates);

  await logAuditEvent({
    adminId,
    adminUsername,
    action: 'SCENARIO_UPDATED',
    resourceType: 'scenario',
    resourceId: scenarioId
  });

  return existing;
}

export async function toggleScenarioPublish(
  scenarioId: string,
  isPublished: boolean,
  adminId: string,
  adminUsername: string
): Promise<{ id: string; isPublished: boolean }> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      'UPDATE scenarios SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_published as "isPublished"',
      [isPublished, scenarioId]
    );
    if (!res.rows[0]) throw new AppError('Scenario not found.', 404, 'SCENARIO_NOT_FOUND');

    await logAuditEvent({
      adminId,
      adminUsername,
      action: isPublished ? 'SCENARIO_PUBLISHED' : 'SCENARIO_UNPUBLISHED',
      resourceType: 'scenario',
      resourceId: scenarioId
    });

    return res.rows[0];
  }

  const existing = memoryAdminScenarios[scenarioId];
  if (!existing) throw new AppError('Scenario not found.', 404, 'SCENARIO_NOT_FOUND');
  existing.isPublished = isPublished;

  await logAuditEvent({
    adminId,
    adminUsername,
    action: isPublished ? 'SCENARIO_PUBLISHED' : 'SCENARIO_UNPUBLISHED',
    resourceType: 'scenario',
    resourceId: scenarioId
  });

  return { id: scenarioId, isPublished };
}

/**
 * Returns aggregate completion data (Strictly anonymous metrics, zero PII)
 */
export async function getAggregateCompletionData() {
  if (getPostgresStatus()) {
    const totalLearnersRes = await pool.query(
      'SELECT COUNT(DISTINCT anonymous_learner_id) as "totalLearners" FROM learner_completions'
    );
    const totalCompletionsRes = await pool.query(
      'SELECT COUNT(*) as "totalCompletions" FROM learner_completions WHERE status = $1',
      ['completed']
    );
    const avgScoreRes = await pool.query(
      'SELECT ROUND(AVG(quiz_score), 1) as "avgScore" FROM learner_completions WHERE status = $1',
      ['completed']
    );
    const moduleStatsRes = await pool.query(
      `SELECT m.id, m.title, COUNT(c.id) as "completionsCount", ROUND(AVG(c.quiz_score), 1) as "avgScore"
       FROM training_modules m
       LEFT JOIN learner_completions c ON m.id = c.module_id AND c.status = 'completed'
       GROUP BY m.id, m.title`
    );

    return {
      overview: {
        totalUniqueLearners: parseInt(totalLearnersRes.rows[0]?.totalLearners || '0', 10),
        totalCompletions: parseInt(totalCompletionsRes.rows[0]?.totalCompletions || '0', 10),
        averageScore: parseFloat(avgScoreRes.rows[0]?.avgScore || '0')
      },
      moduleBreakdown: moduleStatsRes.rows,
      simulationInterceptions: getInterceptionMetrics()
    };
  }

  // Fallback in-memory
  return {
    overview: {
      totalUniqueLearners: 42,
      totalCompletions: 38,
      averageScore: 88.5
    },
    moduleBreakdown: [
      { id: 'mod-email-phish', title: 'Spearphishing & Email Header Analysis', completionsCount: 38, avgScore: 89.2 },
      { id: 'mod-url-dissection', title: 'Deceptive URL Dissection', completionsCount: 29, avgScore: 84.0 },
      { id: 'mod-mfa-fatigue', title: 'MFA Fatigue Defense', completionsCount: 22, avgScore: 92.4 }
    ],
    simulationInterceptions: getInterceptionMetrics()
  };
}

/**
 * Exports anonymized training compliance report in JSON or CSV format
 */
export async function exportAnonymizedReport(format: 'json' | 'csv' = 'json', moduleId?: string) {
  let records: Array<{
    learnerHash: string;
    moduleId: string;
    status: string;
    score: number;
    completionTimestamp: string;
  }> = [];

  if (getPostgresStatus()) {
    let queryText = `
      SELECT anonymous_learner_id as "learnerHash", module_id as "moduleId", 
             status, quiz_score as "score", completed_at as "completionTimestamp"
      FROM learner_completions
      WHERE status = 'completed'
    `;
    const queryParams: any[] = [];
    if (moduleId) {
      queryText += ' AND module_id = $1';
      queryParams.push(moduleId);
    }
    queryText += ' ORDER BY completed_at DESC LIMIT 500';

    const res = await pool.query(queryText, queryParams);
    records = res.rows;
  } else {
    // In-memory dummy data
    records = [
      { learnerHash: 'aegis-lrn-78a9', moduleId: 'mod-email-phish', status: 'completed', score: 95, completionTimestamp: new Date().toISOString() },
      { learnerHash: 'aegis-lrn-33f2', moduleId: 'mod-email-phish', status: 'completed', score: 85, completionTimestamp: new Date().toISOString() },
      { learnerHash: 'aegis-lrn-91cc', moduleId: 'mod-url-dissection', status: 'completed', score: 90, completionTimestamp: new Date().toISOString() }
    ];
  }

  if (format === 'csv') {
    const csvHeader = 'AnonymousLearnerHash,ModuleId,TrainingStatus,QuizScore,CompletionTimestamp\n';
    const csvRows = records.map(r => 
      `"${r.learnerHash}","${r.moduleId}","${r.status}",${r.score},"${r.completionTimestamp}"`
    ).join('\n');

    return {
      contentType: 'text/csv',
      filename: `aegisloom-anonymized-training-report-${Date.now()}.csv`,
      data: csvHeader + csvRows
    };
  }

  return {
    contentType: 'application/json',
    filename: `aegisloom-anonymized-training-report-${Date.now()}.json`,
    data: {
      generatedAt: new Date().toISOString(),
      recordCount: records.length,
      privacyStatement: 'This report contains strictly anonymous training identifiers. Zero credentials or PII are retained.',
      records
    }
  };
}

/**
 * Retrieves audit logs for security oversight
 */
export async function getAuditLogs(limit: number = 50) {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, admin_id as "adminId", admin_username as "adminUsername", action, 
              resource_type as "resourceType", resource_id as "resourceId", 
              ip_address as "ipAddress", user_agent as "userAgent", details, 
              created_at as "createdAt"
       FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
  return memoryAuditLogs.slice(0, limit);
}
