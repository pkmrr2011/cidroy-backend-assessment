import { sequelize, User, Product } from '../models/index.js';
import { logger } from '../config/logger.js';

async function seedAuth() {
  logger.info('Starting auth and products database seeding (Safe & Non-Destructive)...');

  await sequelize.authenticate();
  logger.info('Connected to MySQL.');

  logger.info('Syncing database models before seeding...');
  await sequelize.sync();
  logger.info('Database models synced.');

  // 1. Seed Users
  logger.info('Seeding default users...');
  const usersData = [
    {
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin' as const,
    },
    {
      email: 'manager@example.com',
      password: 'password123',
      role: 'manager' as const,
    },
    {
      email: 'staff@example.com',
      password: 'password123',
      role: 'staff' as const,
    },
  ];

  await Promise.allSettled(
    usersData.map((data) =>
      User.findOrCreate({
        where: { email: data.email },
        defaults: data,
      })
    )
  );
  logger.info('Users seeding completed.');

  // 2. Seed Products
  logger.info('Seeding mock products...');
  const productsData = [
    {
      name: 'MacBook Pro 16"',
      description: 'M3 Max chip, 36GB RAM, 1TB SSD, Space Black.',
      price: 2499.99,
      stock: 15,
      category: 'electronics' as const,
      isActive: true,
    },
    {
      name: 'iPhone 15 Pro Max',
      description: 'Titanium design, A17 Pro chip, 256GB, Blue Titanium.',
      price: 1199.0,
      stock: 45,
      category: 'electronics' as const,
      isActive: true,
    },
    {
      name: 'Premium Denim Jacket',
      description: 'Vintage wash, 100% organic cotton.',
      price: 89.5,
      stock: 30,
      category: 'clothing' as const,
      isActive: true,
    },
    {
      name: 'Classic White Tee',
      description: 'Super-soft combed cotton, crew neck.',
      price: 19.99,
      stock: 120,
      category: 'clothing' as const,
      isActive: true,
    },
    {
      name: 'Organic Almond Milk',
      description: 'Unsweetened, vanilla flavor, 1L.',
      price: 3.49,
      stock: 80,
      category: 'food' as const,
      isActive: true,
    },
    {
      name: 'Gluten-Free Oats',
      description: '100% whole grain rolled oats, 500g.',
      price: 4.99,
      stock: 65,
      category: 'food' as const,
      isActive: true,
    },
    {
      name: 'Ergonomic Desk Chair',
      description: 'High-back mesh chair with lumbar support.',
      price: 189.0,
      stock: 8,
      category: 'other' as const,
      isActive: true,
    },
  ];

  await Promise.allSettled(
    productsData.map((data) =>
      Product.findOrCreate({
        where: { name: data.name },
        defaults: data,
      })
    )
  );
  logger.info('Products seeding completed.');

  logger.info('Auth and products database seeding completed safely.');
  await sequelize.close();
}

seedAuth().catch((err) => {
  logger.error(`Error during auth/products seeding: ${err.message}`);
  process.exit(1);
});
