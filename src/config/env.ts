/**
 * AegisLoom Security Lab — Environment Configuration Validator
 * Validates and exports strongly-typed application configuration.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(v => parseInt(v, 10)).default('4000'),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
  ENFORCE_HTTPS: z.string().transform(v => v === 'true').default('false'),

  // PostgreSQL
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/aegisloom_training'),
  DB_SSL: z.string().transform(v => v === 'true').default('false'),
  DB_POOL_MAX: z.string().transform(v => parseInt(v, 10)).default('20'),
  DB_TIMEOUT_MS: z.string().transform(v => parseInt(v, 10)).default('5000'),

  // Auth / Security
  JWT_SECRET: z.string().min(16).default('aegisloom_development_secret_key_minimum_32_characters_long_12345'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_SECRET: z.string().min(16).default('aegisloom_development_refresh_secret_key_minimum_32_chars_12345'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MFA_APP_NAME: z.string().default('AegisLoom Security Lab'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(v => parseInt(v, 10)).default('900000'), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(v => parseInt(v, 10)).default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(v => parseInt(v, 10)).default('5'),

  // Optional live URL reputation lookup
  LINK_REPUTATION_ENABLED: z.string().transform(v => v === 'true').default('false'),
  VIRUSTOTAL_API_KEY: z.string().min(1).optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid AegisLoom environment variables configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
