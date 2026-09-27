import { createEmailWorker } from './queue/worker';
import { checkDatabaseConnection, prisma } from './config/db';
import { checkRedisConnection } from './config/redis';
import { config } from './config/env';
import { logger } from './utils/logger';

async function startWorkerProcess(): Promise<void> {
  logger.info(`================================================================`);
  logger.info(`⚡ EmailOrchestrator BullMQ Worker Process Initializing...`);
  logger.info(`⚙️  Worker Concurrency Level: ${config.workerConcurrency}`);
  logger.info(`================================================================`);

  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);

  if (!dbOk || !redisOk) {
    logger.error('CRITICAL: Cannot start BullMQ worker without active Database and Redis connections.');
    process.exit(1);
  }

  const worker = createEmailWorker();

  logger.info(`✅ BullMQ Worker listening on queue 'email-queue'`);

  const gracefulShutdown = async () => {
    logger.info('Shutting down BullMQ worker gracefully...');
    await worker.close();
    await prisma.$disconnect();
    logger.info('Worker closed. Process exiting.');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startWorkerProcess().catch((error) => {
  logger.error('Fatal error in BullMQ worker process:', error);
  process.exit(1);
});
