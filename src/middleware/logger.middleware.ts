import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
    const { method, originalUrl } = req;
    const { statusCode } = res;

    logger.info(`${method} ${originalUrl} ${statusCode} ${timeInMs}ms`);
  });

  next();
}
