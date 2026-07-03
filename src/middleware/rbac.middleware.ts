import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

export function rbacMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const error = new Error('Authentication required') as AppError;
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Access denied: insufficient permissions') as AppError;
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}
