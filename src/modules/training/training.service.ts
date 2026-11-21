/**
 * AegisLoom Security Lab — Training & Awareness Service
 * Minimum anonymous metadata tracking, safe quiz evaluation, and verifiable certificates.
 */

import { pool, getPostgresStatus } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  generateCertificateData,
  renderCertificateSvg,
  CertificateData
} from '../../utils/certificateGenerator';
import { logger } from '../../utils/logger';

export interface TrainingModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  isActive: boolean;
  orderIndex: number;
}

export interface FictionalScenario {
  id: string;
  moduleId: string;
  title: string;
  fictionalSenderName: string;
  fictionalSenderEmail: string;
  fictionalRecipient: string;
  subject: string;
  bodyHtml: string;
  warningSignals: Array<{ type: string; indicator: string; explanation: string }>;
  educationalTakeaways: string[];
}

export interface QuizQuestion {
  id: string;
  moduleId: string;
  scenarioText: string;
  questionText: string;
  options: Array<{ id: string; text: string; is_correct?: boolean; explanation?: string }>;
  orderIndex: number;
}

// In-Memory Seed Fallback Store
const memoryModules: TrainingModule[] = [
  {
    id: 'mod-email-phish',
    slug: 'email-phishing-defense',
    title: 'Spearphishing & Email Header Analysis',
    description: 'Learn to detect lookalike sender domains, artificial urgency, and deceptive link targets in enterprise email communications.',
    category: 'Social Engineering',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    isActive: true,
    orderIndex: 1
  },
  {
    id: 'mod-url-dissection',
    slug: 'url-inspection-sandbox',
    title: 'Deceptive URL Dissection & Typosquatting',
    description: 'Analyze domain architecture, subdomain masking, internationalized homographs, and fraudulent single-sign-on portals.',
    category: 'Technical Analysis',
    difficulty: 'Intermediate',
    estimatedMinutes: 20,
    isActive: true,
    orderIndex: 2
  },
  {
    id: 'mod-mfa-fatigue',
    slug: 'mfa-fatigue-push-bombing',
    title: 'Multi-Factor Authentication (MFA) Fatigue Defense',
    description: 'Understand how cyber adversaries bypass 2FA through continuous push notification bombardment and psychological exhaustion.',
    category: 'Identity Defense',
    difficulty: 'Intermediate',
    estimatedMinutes: 15,
    isActive: true,
    orderIndex: 3
  },
  {
    id: 'mod-attachment-safety',
    slug: 'malicious-attachments-hygiene',
    title: 'Executable Disguises & Malicious Payload Hygiene',
    description: 'Master the detection of double extensions, weaponized office macros, and deceptive screen saver (.scr) attachments.',
    category: 'Endpoint Security',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    isActive: true,
    orderIndex: 4
  }
];

const memoryScenarios: FictionalScenario[] = [
  {
    id: 'scen-auragrid-sso',
    moduleId: 'mod-email-phish',
    title: 'Fictional AuraGrid Single Sign-On Expiration Notice',
    fictionalSenderName: 'AuraGrid Identity Incident Team',
    fictionalSenderEmail: 'security-alerts@auragrid-verify-sso-portal.net',
    fictionalRecipient: 'jordan.hayes@kestreldynamics-corp.internal',
    subject: '[ACTION REQUIRED] Immediate Password Expiration & Session Lockout in 2 Hours',
    bodyHtml: '<div class="email-body"><h3>AuraGrid Cloud Identity Notice</h3><p>Dear Valued Account Holder ID #8849-KX,</p><p>Our automated telemetry detected an unverified session renewal attempt. Your corporate single sign-on access will be <strong>terminated within 2 hours</strong> unless your identity is verified.</p><p><a href="http://auragrid-verify-sso-portal.net/auth.php" class="cta-link">https://sso.auragrid.io/auth/login-verify</a></p></div>',
    warningSignals: [
      {
        type: 'sender_domain',
        indicator: 'auragrid-verify-sso-portal.net',
        explanation: 'Typosquatting / hyphenated domain mimicking official corporate provider auragrid.io.'
      },
      {
        type: 'urgency_countdown',
        indicator: '2 Hours deadline',
        explanation: 'Artificial time pressure designed to induce panic and inhibit rational security consultation.'
      },
      {
        type: 'mismatched_url',
        indicator: 'Visible anchor text auragrid.io vs target auragrid-verify-sso-portal.net',
        explanation: 'Anchor text visually misleads user into believing the destination is authentic.'
      },
      {
        type: 'disguised_attachment',
        indicator: 'AuraGrid_Security_Update_v4.2.scr.pdf',
        explanation: 'Double-extension camouflage hiding Windows executable .scr payload.'
      }
    ],
    educationalTakeaways: [
      'Never trust visible anchor text; inspect the destination address bar.',
      'Internal IT and Identity systems communicate planned credential changes well in advance.',
      'Always report unverified emails using the corporate Report Phish mechanism.'
    ]
  }
];

const memoryQuestions: QuizQuestion[] = [
  {
    id: 'q-101',
    moduleId: 'mod-email-phish',
    scenarioText: 'You receive an urgent message from "IT Helpdesk <support@kestrel-cloud-sso.cc>" asking you to re-verify credentials.',
    questionText: 'Which indicator definitively reveals that this communication is fraudulent?',
    options: [
      { id: 'a', text: 'The email arrived during peak morning business hours.', is_correct: false, explanation: 'Phishing emails can arrive at any hour of the day.' },
      { id: 'b', text: 'The sender domain (@kestrel-cloud-sso.cc) does not match the official corporate domain (@kestreldynamics-corp.internal).', is_correct: true, explanation: 'The domain following the @ symbol indicates the true originating mail server.' },
      { id: 'c', text: 'The email includes an official corporate banner logo.', is_correct: false, explanation: 'Logos and styling are easily copied by attackers from public websites.' },
      { id: 'd', text: 'The email contains your company name in the subject line.', is_correct: false, explanation: 'Attackers routinely harvest organizational names from public platforms like LinkedIn.' }
    ],
    orderIndex: 1
  },
  {
    id: 'q-102',
    moduleId: 'mod-email-phish',
    scenarioText: 'A link directs you to "https://portal.kestreldynamics.internal.secure-login-worker.net/auth".',
    questionText: 'Who is the legal controlling entity of this web destination?',
    options: [
      { id: 'a', text: 'Kestrel Dynamics, because kestreldynamics.internal appears first in the URL string.', is_correct: false, explanation: 'Everything preceding the root domain is a subdomain, which any domain owner can forge.' },
      { id: 'b', text: 'The owner of the root domain secure-login-worker.net.', is_correct: true, explanation: 'The domain directly preceding the Top-Level Domain (.net) owns and receives all incoming traffic.' },
      { id: 'c', text: 'Your local browser, because the connection begins with https://.', is_correct: false, explanation: 'HTTPS provides transport encryption, not server owner integrity.' },
      { id: 'd', text: 'No entity, because the domain format is invalid.', is_correct: false, explanation: 'This is a valid URL structure frequently utilized in credential harvesting campaigns.' }
    ],
    orderIndex: 2
  }
];

// In-Memory completions & certificates store
export const memoryCompletions: Record<string, any> = {};
export const memoryCertificates: Record<string, CertificateData> = {};

export async function getAllModules(): Promise<TrainingModule[]> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, slug, title, description, category, difficulty, 
              estimated_minutes as "estimatedMinutes", is_active as "isActive", order_index as "orderIndex"
       FROM training_modules WHERE is_active = TRUE ORDER BY order_index ASC`
    );
    return res.rows;
  }
  return memoryModules.filter(m => m.isActive);
}

export async function getModuleById(id: string): Promise<TrainingModule> {
  const modules = await getAllModules();
  const found = modules.find(m => m.id === id || m.slug === id);
  if (!found) throw new AppError('Training module not found.', 404, 'MODULE_NOT_FOUND');
  return found;
}

export async function getScenariosForModule(moduleId: string): Promise<FictionalScenario[]> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, module_id as "moduleId", title, fictional_sender_name as "fictionalSenderName",
              fictional_sender_email as "fictionalSenderEmail", fictional_recipient as "fictionalRecipient",
              subject, body_html as "bodyHtml", warning_signals as "warningSignals",
              educational_takeaways as "educationalTakeaways"
       FROM scenarios WHERE module_id = $1 AND is_published = TRUE`,
      [moduleId]
    );
    return res.rows;
  }
  return memoryScenarios.filter(s => s.moduleId === moduleId);
}

export async function getScenarioById(id: string): Promise<FictionalScenario> {
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, module_id as "moduleId", title, fictional_sender_name as "fictionalSenderName",
              fictional_sender_email as "fictionalSenderEmail", fictional_recipient as "fictionalRecipient",
              subject, body_html as "bodyHtml", warning_signals as "warningSignals",
              educational_takeaways as "educationalTakeaways"
       FROM scenarios WHERE id = $1 AND is_published = TRUE`,
      [id]
    );
    if (!res.rows[0]) throw new AppError('Scenario not found.', 404, 'SCENARIO_NOT_FOUND');
    return res.rows[0];
  }
  const found = memoryScenarios.find(s => s.id === id);
  if (!found) throw new AppError('Scenario not found.', 404, 'SCENARIO_NOT_FOUND');
  return found;
}

/**
 * Returns safe quiz questions for learners (MASKS is_correct field)
 */
export async function getSafeQuizQuestions(moduleId: string): Promise<QuizQuestion[]> {
  let questions: QuizQuestion[] = [];
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, module_id as "moduleId", scenario_text as "scenarioText",
              question_text as "questionText", options, order_index as "orderIndex"
       FROM quiz_questions WHERE module_id = $1 ORDER BY order_index ASC`,
      [moduleId]
    );
    questions = res.rows;
  } else {
    questions = memoryQuestions.filter(q => q.moduleId === moduleId);
  }

  // Sanitize: Strip is_correct and explanation from public quiz payload
  return questions.map(q => ({
    ...q,
    options: q.options.map(opt => ({
      id: opt.id,
      text: opt.text
    }))
  }));
}

/**
 * Evaluates quiz submission and returns detailed educational rationale
 */
export async function evaluateQuizSubmission(
  moduleId: string,
  anonymousLearnerId: string,
  userAnswers: Record<string, string>
) {
  let questions: QuizQuestion[] = [];
  if (getPostgresStatus()) {
    const res = await pool.query(
      `SELECT id, module_id as "moduleId", scenario_text as "scenarioText",
              question_text as "questionText", options
       FROM quiz_questions WHERE module_id = $1`,
      [moduleId]
    );
    questions = res.rows;
  } else {
    questions = memoryQuestions.filter(q => q.moduleId === moduleId);
  }

  if (questions.length === 0) {
    throw new AppError('No quiz questions configured for this module.', 404, 'NO_QUESTIONS');
  }

  let correctCount = 0;
  const evaluations = questions.map(q => {
    const selectedOptionId = userAnswers[q.id];
    const correctOpt = q.options.find(o => o.is_correct);
    const selectedOpt = q.options.find(o => o.id === selectedOptionId);

    const isCorrect = correctOpt ? correctOpt.id === selectedOptionId : false;
    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      scenario: q.scenarioText,
      question: q.questionText,
      selectedOptionId: selectedOptionId || null,
      isCorrect,
      correctOptionId: correctOpt ? correctOpt.id : null,
      educationalRationale: selectedOpt?.explanation || correctOpt?.explanation || 'Follow organizational security policies.'
    };
  });

  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
  const isPassed = scorePercentage >= 70;

  // Record Completion Record (MINIMUM ANONYMOUS METADATA ONLY)
  const completionId = `comp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
  let certificateData: CertificateData | null = null;

  if (isPassed) {
    const module = await getModuleById(moduleId);
    certificateData = generateCertificateData(
      anonymousLearnerId,
      moduleId,
      module.title,
      correctCount,
      totalQuestions
    );

    memoryCertificates[certificateData.certificateId] = certificateData;

    if (getPostgresStatus()) {
      await pool.query(
        `INSERT INTO learner_completions 
          (anonymous_learner_id, module_id, status, quiz_score, total_questions, certificate_id, completed_at)
         VALUES ($1, $2, 'completed', $3, $4, $5, NOW())`,
        [anonymousLearnerId, moduleId, correctCount, totalQuestions, certificateData.certificateId]
      );
    }
  }

  memoryCompletions[completionId] = {
    completionId,
    anonymousLearnerId,
    moduleId,
    scorePercentage,
    correctCount,
    totalQuestions,
    isPassed,
    certificateId: certificateData?.certificateId || null
  };

  return {
    completionId,
    scorePercentage,
    correctCount,
    totalQuestions,
    isPassed,
    evaluations,
    certificate: certificateData ? {
      certificateId: certificateData.certificateId,
      verificationHash: certificateData.verificationHash,
      downloadUrl: `/api/v1/training/certificate/${certificateData.certificateId}?format=svg`
    } : null
  };
}

/**
 * Retrieves certificate in JSON or SVG format
 */
export async function getCertificate(certificateId: string, format: 'json' | 'svg' = 'json') {
  let cert = memoryCertificates[certificateId];

  if (!cert && getPostgresStatus()) {
    const res = await pool.query(
      `SELECT c.certificate_id as "certificateId", c.anonymous_learner_id as "anonymousLearnerId",
              m.title as "moduleTitle", c.completed_at as "completedAt", c.quiz_score as "score", c.total_questions as "totalQuestions"
       FROM learner_completions c
       JOIN training_modules m ON c.module_id = m.id
       WHERE c.certificate_id = $1`,
      [certificateId]
    );

    if (res.rows[0]) {
      const row = res.rows[0];
      cert = generateCertificateData(
        row.anonymousLearnerId,
        'module',
        row.moduleTitle,
        row.score,
        row.totalQuestions
      );
      cert.certificateId = row.certificateId;
    }
  }

  if (!cert) {
    throw new AppError('Certificate not found.', 404, 'CERTIFICATE_NOT_FOUND');
  }

  if (format === 'svg') {
    return {
      contentType: 'image/svg+xml',
      data: renderCertificateSvg(cert)
    };
  }

  return {
    contentType: 'application/json',
    data: cert
  };
}
