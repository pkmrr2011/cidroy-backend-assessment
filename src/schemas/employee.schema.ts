import { Schema } from 'ajv';

export const getEmployeesQuerySchema: Schema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, default: 20 },
    hasAccess: { type: 'boolean' },
    search: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

export const updateAccessBodySchema: Schema = {
  type: 'object',
  properties: {
    hasAccess: { type: 'boolean' },
  },
  required: ['hasAccess'],
  additionalProperties: false,
};
