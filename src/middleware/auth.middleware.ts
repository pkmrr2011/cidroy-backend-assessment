import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { AppError } from './error.middleware.js';
import { User } from '../models/index.js';

export interface UserPayload {
  id: number;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Authentication token required') as AppError;
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.split(' ')[1];

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err: any) {
      const error = new Error('Invalid or expired authentication token') as AppError;
      error.statusCode = 401;
      return next(error);
    }

    const user = await User.findByPk(decoded.id, { raw: true });
    if (!user) {
      const error = new Error('User not found') as AppError;
      error.statusCode = 401;
      return next(error);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err: any) {
    next(err);
  }
}
