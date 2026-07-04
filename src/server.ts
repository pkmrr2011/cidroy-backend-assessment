import cluster from 'cluster';
import os from 'os';
import { logger } from './config/logger.js';
import { sequelize } from './models/index.js';
import { startTcpServer } from './services/tcp.service.js';
import { connectRedis } from './config/redis.js';
import { env } from './config/env.js';

async function connectWithRetry(retries = 5, delay = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info('Primary process database connection authenticated');
      return;
    } catch (error: any) {
      logger.warn(
        `Database connection attempt ${i + 1}/${retries} failed: ${error.message}. Retrying in ${delay}ms...`
      );
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
  }
  throw new Error('Could not connect to database after maximum retries');
}

if (cluster.isPrimary) {
  try {
    logger.info('Primary process initializing connections...');
    await connectWithRetry(5, 2000);

    logger.info('Primary process connecting to Redis...');
    await connectRedis();

    // Run database sync ONLY in the master process, ensuring it runs exactly once!
    if (env.NODE_ENV !== 'production') {
      logger.info('Primary process syncing database models...');
      await sequelize.sync();
      logger.info('Database models synced successfully');
    }

    // Start IoT Hardware TCP Socket Listener on port 9000
    startTcpServer(9000);
  } catch (error: any) {
    logger.error(`Failed to initialize primary process services: ${error.message}`);
    process.exit(1);
  }

  const numCPUs = os.cpus().length;
  logger.info(`Primary process ${process.pid} is running. Forking ${numCPUs} workers...`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, _signal) => {
    logger.warn(
      `Worker process ${worker.process.pid} died with code ${code}. Forking replacement...`
    );
    cluster.fork();
  });
} else {
  // Workers start the application
  import('./app.js');
}
