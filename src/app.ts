import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { sequelize } from './models/index.js';
import { connectRedis } from './config/redis.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers (CSP disabled to allow simulator inline scripts/styles) & Response Compression
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());
app.use(cors());

// Global Rate Limiting to prevent brute-force/scanner malfunction floods
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Logger Middleware
app.use(loggerMiddleware);

// Serve static dashboard files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use(routes);

// Global Error Handler Middleware
app.use(errorMiddleware);

// Initialize Database, Redis & Start Server
async function startServer() {
  try {
    logger.info('Connecting to MySQL database via Sequelize...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    logger.info('Connecting to Redis cache...');
    await connectRedis();

    app.listen(env.PORT, () => {
      logger.info(`Worker process ${process.pid} running on port ${env.PORT}`);
    });
  } catch (error: any) {
    logger.error(`Failed to start worker server: ${error.message}`);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
