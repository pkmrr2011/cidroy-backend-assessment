import { Schema } from 'ajv';

export const createProductSchema: Schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    price: { type: 'number', minimum: 0.01 },
    stock: { type: 'integer', minimum: 0, default: 0 },
    category: { type: 'string', enum: ['electronics', 'clothing', 'food', 'other'] },
    isActive: { type: 'boolean', default: true },
  },
  required: ['name', 'price', 'category'],
  additionalProperties: false,
};

export const updateProductSchema: Schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    price: { type: 'number', minimum: 0.01 },
    stock: { type: 'integer', minimum: 0 },
    category: { type: 'string', enum: ['electronics', 'clothing', 'food', 'other'] },
    isActive: { type: 'boolean' },
  },
  required: ['name', 'price', 'stock', 'category', 'isActive'],
  additionalProperties: false,
};

export const patchProductSchema: Schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    price: { type: 'number', minimum: 0.01 },
    stock: { type: 'integer', minimum: 0 },
    category: { type: 'string', enum: ['electronics', 'clothing', 'food', 'other'] },
    isActive: { type: 'boolean' },
  },
  additionalProperties: false,
};
