import { Sequelize } from 'sequelize';
import { env } from './env.js';
import { logger } from './logger.js';

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: env.NODE_ENV === 'production' ? false : (msg) => logger.debug(msg),
  pool: {
    max: 25,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true, // Use snake_case for fields in DB
    timestamps: true, // Automatically add created_at, updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});
