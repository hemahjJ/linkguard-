/**
 * AegisLoom Security Lab — Server Entrypoint
 * Initializes database pool, loads environment, and starts listening on configured port.
 */

import { app } from './app';
import { env } from './config/env';
import { testDatabaseConnection, pool } from './config/database';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  // Test PostgreSQL connection
  await testDatabaseConnection();

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`🛡️ AegisLoom Security Lab Backend running at http://${env.HOST}:${env.PORT}`);
    logger.info(`📋 Environment: [${env.NODE_ENV}] | Strict zero-credential policy active.`);
    logger.info(`📖 API Docs available at: http://${env.HOST}:${env.PORT}/api/docs`);
  });

  // Graceful Shutdown Handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully terminating AegisLoom backend...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await pool.end();
      logger.info('Database connections closed.');
      process.exit(0);
    });

    // Force exit if shutdown hangs beyond 10s
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Fatal startup error in AegisLoom backend', { error: err.message });
    process.exit(1);
  });
}

export { startServer };
