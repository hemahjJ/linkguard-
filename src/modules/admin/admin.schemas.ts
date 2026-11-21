/**
 * AegisLoom Security Lab — Admin Validation Schemas
 */

import { z } from 'zod';

export const createScenarioSchema = z.object({
  body: z.object({
    id: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, 'Scenario ID must be lowercase alphanumeric and hyphens'),
    moduleId: z.string().min(2),
    title: z.string().min(5).max(255),
    fictionalSenderName: z.string().min(2).max(255),
    fictionalSenderEmail: z.string().email(),
    fictionalRecipient: z.string().min(3).max(255),
    subject: z.string().min(3).max(255),
    bodyHtml: z.string().min(10),
    warningSignals: z.array(z.object({
      type: z.string(),
      indicator: z.string(),
      explanation: z.string()
    })).default([]),
    educationalTakeaways: z.array(z.string()).default([]),
    isPublished: z.boolean().default(true)
  })
});

export const updateScenarioSchema = z.object({
  params: z.object({
    id: z.string().min(2)
  }),
  body: z.object({
    title: z.string().min(5).max(255).optional(),
    fictionalSenderName: z.string().min(2).max(255).optional(),
    fictionalSenderEmail: z.string().email().optional(),
    fictionalRecipient: z.string().min(3).max(255).optional(),
    subject: z.string().min(3).max(255).optional(),
    bodyHtml: z.string().min(10).optional(),
    warningSignals: z.array(z.object({
      type: z.string(),
      indicator: z.string(),
      explanation: z.string()
    })).optional(),
    educationalTakeaways: z.array(z.string()).optional(),
    isPublished: z.boolean().optional()
  })
});

export const exportAnalyticsSchema = z.object({
  query: z.object({
    format: z.enum(['json', 'csv']).default('json'),
    moduleId: z.string().optional()
  })
});
