import { Schema } from 'ajv';

export const rfidScanSchema: Schema = {
  type: 'object',
  properties: {
    cardUid: { type: 'string', minLength: 4 },
    deviceId: { type: 'string', minLength: 1 },
    direction: { type: 'string', enum: ['in', 'out'] },
  },
  required: ['cardUid', 'deviceId', 'direction'],
  additionalProperties: false,
};

export const biometricScanSchema: Schema = {
  type: 'object',
  properties: {
    biometricId: { type: 'integer', minimum: 1 },
    deviceId: { type: 'string', minLength: 1 },
    direction: { type: 'string', enum: ['in', 'out'] },
  },
  required: ['biometricId', 'deviceId', 'direction'],
  additionalProperties: false,
};

export const cameraTriggerSchema: Schema = {
  type: 'object',
  properties: {
    deviceId: { type: 'string', minLength: 1 },
    direction: { type: 'string', enum: ['in', 'out'] },
    email: { type: 'string', format: 'email' }, // Lookup customer by email for face recognition match
    rtspSnapshot: { type: 'string', minLength: 1 }, // Capture frame snapshot url
  },
  required: ['deviceId', 'direction', 'email', 'rtspSnapshot'],
  additionalProperties: false,
};

export const accessLogQuerySchema: Schema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['granted', 'denied'] },
    deviceType: { type: 'string', enum: ['rfid', 'biometric', 'face_recognition'] },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, default: 20 },
  },
  additionalProperties: false,
};
