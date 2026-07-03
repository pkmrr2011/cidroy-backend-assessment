import { Schema } from 'ajv';

export const registerSchema: Schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
    role: { type: 'string', enum: ['admin', 'manager', 'staff'] },
  },
  required: ['email', 'password'],
  additionalProperties: false,
};

export const loginSchema: Schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
  required: ['email', 'password'],
  additionalProperties: false,
};

export const refreshTokenSchema: Schema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string', minLength: 10 },
  },
  required: ['refreshToken'],
  additionalProperties: false,
};
