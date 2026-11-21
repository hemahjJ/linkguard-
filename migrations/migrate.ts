/**
 * AegisLoom Security Lab — Database Migration Runner
 * Executes SQL migrations in order against the configured PostgreSQL database.
 */

import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Starting AegisLoom database migrations...');

    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const checkRes = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (checkRes.rowCount === 0) {
        logger.info(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          logger.info(`Successfully applied migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error(`Failed to apply migration: ${file}`, { error: (err as Error).message });
          throw err;
        }
      } else {
        logger.info(`Migration already applied: ${file}`);
      }
    }

    logger.info('All database migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Migration process aborted due to error', { error: err.message });
      process.exit(1);
    });
}

export { runMigrations };
