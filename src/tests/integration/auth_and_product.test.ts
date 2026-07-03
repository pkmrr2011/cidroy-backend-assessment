import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app.js';
import { User, RefreshToken, Product } from '../../models/index.js';
import { env } from '../../config/env.js';

// Mock database layer
vi.mock('../../models/index.js', () => {
  return {
    User: {
      findOne: vi.fn(),
      create: vi.fn(),
      findByPk: vi.fn(),
      findAll: vi.fn(),
    },
    RefreshToken: {
      findOne: vi.fn(),
      create: vi.fn(),
    },
    Product: {
      findAndCountAll: vi.fn(),
      findByPk: vi.fn(),
      create: vi.fn(),
    },
    sequelize: {
      authenticate: vi.fn(),
    },
    redisClient: {
      isOpen: false,
    },
  };
});

describe('Auth & Product CRUD Integration Tests (Mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    it('should register a new user successfully', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null as any);
      vi.mocked(User.create).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'staff',
        createdAt: new Date(),
      } as any);

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        role: 'staff',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.role).toBe('staff');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should login and return access & refresh tokens', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'staff',
        comparePassword: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should fail login with invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'staff',
        comparePassword: vi.fn().mockResolvedValue(false),
      };
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });

    it('should rotate tokens on valid refresh request', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'staff',
      };

      // Generate a real token so verification succeeds
      const refreshToken = jwt.sign({ id: 1 }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      const mockStoredToken = {
        id: 10,
        userId: 1,
        expiresAt: new Date(Date.now() + 100000),
        update: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(RefreshToken.findOne).mockResolvedValue(mockStoredToken as any);
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any);
      vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

      const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(mockStoredToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) })
      );
    });

    it('should logout and revoke refresh token', async () => {
      const mockStoredToken = {
        id: 10,
        update: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(RefreshToken.findOne).mockResolvedValue(mockStoredToken as any);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'dummy_refresh_token' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(mockStoredToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) })
      );
    });
  });

  describe('Product CRUD & RBAC Endpoints', () => {
    let adminToken: string;
    let staffToken: string;

    beforeEach(() => {
      adminToken = jwt.sign({ id: 1, email: 'admin@example.com', role: 'admin' }, env.JWT_SECRET);
      staffToken = jwt.sign({ id: 2, email: 'staff@example.com', role: 'staff' }, env.JWT_SECRET);
    });

    it('should allow admin to create a product', async () => {
      vi.mocked(User.findByPk).mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
        role: 'admin',
      } as any);
      vi.mocked(Product.create).mockResolvedValue({
        id: 101,
        name: 'MacBook Pro',
        price: 1999.99,
        category: 'electronics',
      } as any);

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'MacBook Pro',
          price: 1999.99,
          category: 'electronics',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('MacBook Pro');
    });

    it('should deny staff from creating a product (403)', async () => {
      vi.mocked(User.findByPk).mockResolvedValue({
        id: 2,
        email: 'staff@example.com',
        role: 'staff',
      } as any);

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'MacBook Pro',
          price: 1999.99,
          category: 'electronics',
        });

      expect(res.status).toBe(403);
    });

    it('should allow all authenticated users to list products', async () => {
      vi.mocked(User.findByPk).mockResolvedValue({
        id: 2,
        email: 'staff@example.com',
        role: 'staff',
      } as any);
      vi.mocked(Product.findAndCountAll).mockResolvedValue({
        count: 1,
        rows: [{ id: 101, name: 'MacBook Pro', price: 1999.99, category: 'electronics' }],
      } as any);

      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(1);
      expect(res.headers).toHaveProperty('x-total-count', '1');
    });
  });
});
