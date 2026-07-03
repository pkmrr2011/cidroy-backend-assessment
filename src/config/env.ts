import dotenv from 'dotenv';
import Ajv from 'ajv';

// Load env variables
dotenv.config();

const envSchema = {
  type: 'object',
  properties: {
    PORT: { type: 'integer', default: 3000 },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    DB_HOST: { type: 'string', default: '127.0.0.1' },
    DB_PORT: { type: 'integer', default: 3306 },
    DB_USER: { type: 'string', default: 'postgres' },
    DB_PASSWORD: { type: 'string', default: 'postgres' },
    DB_NAME: { type: 'string', default: 'cidroy_db' },
    REDIS_HOST: { type: 'string', default: '127.0.0.1' },
    REDIS_PORT: { type: 'integer', default: 6379 },
  },
  required: ['DB_USER', 'DB_NAME'],
};

// Create AJV instance with coercion
const ajv = new Ajv.default({
  coerceTypes: true,
  useDefaults: true,
  allErrors: true,
});

const validate = ajv.compile(envSchema);
const valid = validate(process.env);

if (!valid) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

// Export parsed env variables
export const env = {
  PORT: process.env.PORT as unknown as number,
  NODE_ENV: process.env.NODE_ENV as string,
  DB_HOST: process.env.DB_HOST as string,
  DB_PORT: process.env.DB_PORT as unknown as number,
  DB_USER: process.env.DB_USER as string,
  DB_PASSWORD: process.env.DB_PASSWORD as string,
  DB_NAME: process.env.DB_NAME as string,
  REDIS_HOST: process.env.REDIS_HOST as string,
  REDIS_PORT: process.env.REDIS_PORT as unknown as number,
};
