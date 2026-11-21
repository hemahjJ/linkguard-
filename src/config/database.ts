/**
 * AegisLoom Security Lab — PostgreSQL Database Client
 * Manages connection pooling and provides fallback mock repository for offline tests.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

let isPostgresAvailable = false;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: env.DB_TIMEOUT_MS,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

/**
 * Validates connection to the database
 */
export async function testDatabaseConnection(): Promise<boolean> {
  if (env.NODE_ENV === 'test') {
    isPostgresAvailable = false;
    return false;
  }
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    isPostgresAvailable = true;
    logger.info('Connected to PostgreSQL successfully.');
    return true;
  } catch (err) {
    isPostgresAvailable = false;
    logger.warn('PostgreSQL not accessible; operating in in-memory simulation repository mode.', {
      hint: 'To enable full persistence, start PostgreSQL or run docker-compose.'
    });
    return false;
  }
}

export function getPostgresStatus(): boolean {
  return isPostgresAvailable;
}

/**
 * Universal safe query function
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
}
