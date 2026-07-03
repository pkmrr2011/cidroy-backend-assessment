import Ajv, { Schema } from 'ajv';
import addFormats from 'ajv-formats';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

// Setup AJV with all errors and format support
const ajv = new Ajv.default({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
});
addFormats.default(ajv);

export function validate(schema: Schema, property: 'body' | 'query' | 'params' = 'body') {
  const validateSchema = ajv.compile(schema);

  return (req: Request, res: Response, next: NextFunction) => {
    const valid = validateSchema(req[property]);

    if (!valid) {
      const error = new Error('Validation Failed') as AppError;
      error.statusCode = 400;
      error.details = validateSchema.errors?.map((err) => ({
        field: err.instancePath.replace(/^\//, '') || err.params.missingProperty || 'value',
        message: err.message,
      }));
      return next(error);
    }

    next();
  };
}
