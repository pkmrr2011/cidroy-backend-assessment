import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, RefreshToken } from '../models/index.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/error.middleware.js';

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateAccessToken = (user: User): string => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (user: User): string => {
  return jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const register = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;

  const existingUser = await User.findOne({ where: { email }, raw: true });
  if (existingUser) {
    const error = new Error('Email is already registered') as AppError;
    error.statusCode = 400;
    return next(error);
  }

  const user = await User.create({ email, password, role });

  res.status(201).json({
    status: 'success',
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('Invalid email or password') as AppError;
    error.statusCode = 401;
    return next(error);
  }

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken(user);

  // Store hashed refresh token in database
  const hashedToken = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    userId: user.id,
    token: hashedToken,
    expiresAt,
    ipAddress: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
  });

  res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  // 1. Verify token structure/expiry
  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (err: any) {
    const error = new Error('Invalid or expired refresh token') as AppError;
    error.statusCode = 401;
    return next(error);
  }

  const hashedToken = hashToken(refreshToken);

  // 2. Lookup active token in DB
  const storedToken = await RefreshToken.findOne({
    where: {
      token: hashedToken,
      revokedAt: null,
    },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    const error = new Error('Refresh token is invalid or expired') as AppError;
    error.statusCode = 401;
    return next(error);
  }

  // Fetch the user
  const user = await User.findByPk(decoded.id);
  if (!user) {
    const error = new Error('User not found') as AppError;
    error.statusCode = 401;
    return next(error);
  }

  // 3. Rotate tokens: revoke current, issue new pair
  await storedToken.update({ revokedAt: new Date() });

  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = generateRefreshToken(user);
  const newHashedToken = hashToken(newRawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    userId: user.id,
    token: newHashedToken,
    expiresAt,
    ipAddress: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
  });

  res.status(200).json({
    status: 'success',
    data: {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    },
  });
});

export const logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  const hashedToken = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({
    where: { token: hashedToken },
  });

  if (storedToken) {
    await storedToken.update({ revokedAt: new Date() });
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'email', 'role', 'createdAt', 'updatedAt'],
    raw: true,
  });

  res.status(200).json({
    status: 'success',
    data: users,
  });
});
