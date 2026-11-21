/**
 * AegisLoom Security Lab — Training Module Schemas
 */

import { z } from 'zod';

export const evaluateQuizSchema = z.object({
  body: z.object({
    anonymousLearnerId: z.string().min(4).max(128),
    answers: z.record(z.string(), z.string()) // questionId -> selectedOptionId
  }),
  params: z.object({
    moduleId: z.string().min(2)
  })
});

export const recordProgressSchema = z.object({
  body: z.object({
    anonymousLearnerId: z.string().min(4).max(128),
    moduleId: z.string().min(2),
    scenarioId: z.string().optional(),
    status: z.enum(['in_progress', 'completed', 'phish_reported']),
    quizScore: z.number().int().min(0).max(100).optional(),
    totalQuestions: z.number().int().min(0).max(50).optional()
  })
});

export const getCertificateSchema = z.object({
  params: z.object({
    completionId: z.string().min(2)
  }),
  query: z.object({
    format: z.enum(['json', 'svg']).default('json')
  })
});
