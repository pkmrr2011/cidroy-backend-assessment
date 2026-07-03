import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorMiddleware(err: AppError, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error internally
  logger.error({
    message: err.message,
    stack: err.stack,
    details: err.details,
  });

  const errorResponse: Record<string, any> = {
    status: 'error',
    message,
  };

  if (err.details) {
    errorResponse.details = err.details;
  }

  if (env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}
