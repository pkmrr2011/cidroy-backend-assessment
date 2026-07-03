import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { Employee, AccessLog } from '../../models/index.js';

// Mock database layer to prevent route controllers from triggering active db queries
vi.mock('../../models/index.js', () => {
  return {
    Employee: {
      findOne: vi.fn(),
      findAndCountAll: vi.fn(),
      findByPk: vi.fn(),
    },
    AccessLog: {
      create: vi.fn(),
      findAndCountAll: vi.fn(),
    },
    redisClient: {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      isOpen: false,
    },
    sequelize: {
      authenticate: vi.fn(),
    },
  };
});

// Mock redis client separately to support testing cache invalidation
vi.mock('../../config/redis.js', () => {
  return {
    redisClient: {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      isOpen: true,
    },
    connectRedis: vi.fn(),
  };
});

describe('API Route Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/health', () => {
    it('should return UP status and status code 200', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('UP');
    });
  });

  describe('POST /api/v1/iot/rfid-scan', () => {
    it('should validate payloads and return granted access log when swipe is valid', async () => {
      vi.mocked(Employee.findOne).mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        employeeCode: 'EMP-101',
        department: 'Engineering',
      } as any);

      vi.mocked(AccessLog.create).mockResolvedValue({
        id: 101,
        employeeId: 1,
        deviceId: 'GATE_01_RFID',
        deviceType: 'rfid',
        direction: 'in',
        status: 'granted',
        createdAt: new Date(),
      } as any);

      const res = await request(app).post('/api/v1/iot/rfid-scan').send({
        cardUid: 'card_john',
        deviceId: 'GATE_01_RFID',
        direction: 'in',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('granted');
      expect(res.body.data.employee.name).toBe('John Doe');
    });

    it('should return validation error 400 when cardUid parameter is missing', async () => {
      const res = await request(app).post('/api/v1/iot/rfid-scan').send({
        deviceId: 'GATE_01_RFID',
        direction: 'in',
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Validation Failed');
    });
  });

  describe('GET /api/v1/iot/logs', () => {
    it('should retrieve paginated access logs', async () => {
      vi.mocked(AccessLog.findAndCountAll).mockResolvedValue({
        rows: [
          {
            id: 201,
            deviceId: 'GATE_01_RFID',
            deviceType: 'rfid',
            direction: 'in',
            status: 'granted',
            createdAt: new Date(),
            employee: {
              name: 'John Doe',
              email: 'john@example.com',
              employeeCode: 'EMP-101',
              department: 'Engineering',
            },
          },
        ],
        count: 1,
      } as any);

      const res = await request(app).get('/api/v1/iot/logs?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].employee.name).toBe('John Doe');
    });
  });

  describe('Employee Routes', () => {
    describe('GET /api/v1/employees', () => {
      it('should retrieve paginated list of employees', async () => {
        vi.mocked(Employee.findAndCountAll).mockResolvedValue({
          rows: [
            {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              employeeCode: 'EMP-101',
              department: 'Engineering',
              hasAccess: true,
            },
          ],
          count: 1,
        } as any);

        const res = await request(app).get('/api/v1/employees?page=1&limit=10');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data[0].name).toBe('John Doe');
        expect(res.body.meta.total).toBe(1);
      });
    });

    describe('PATCH /api/v1/employees/:id/access', () => {
      it('should update access status and return updated employee', async () => {
        const mockEmployee = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          employeeCode: 'EMP-101',
          cardUid: 'card_john',
          biometricId: 1,
          hasAccess: true,
          update: vi.fn().mockImplementation(function (this: any, updates: any) {
            Object.assign(this, updates);
            return Promise.resolve(this);
          }),
        };

        vi.mocked(Employee.findByPk).mockResolvedValue(mockEmployee as any);

        const res = await request(app)
          .patch('/api/v1/employees/1/access')
          .send({ hasAccess: false });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.hasAccess).toBe(false);
        expect(mockEmployee.update).toHaveBeenCalledWith({ hasAccess: false });
      });

      it('should return 404 when employee does not exist', async () => {
        vi.mocked(Employee.findByPk).mockResolvedValue(null);

        const res = await request(app)
          .patch('/api/v1/employees/999/access')
          .send({ hasAccess: false });

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('error');
        expect(res.body.message).toContain('not found');
      });

      it('should return 400 when validation fails (invalid payload)', async () => {
        const res = await request(app)
          .patch('/api/v1/employees/1/access')
          .send({ hasAccess: 'not-a-boolean' });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
        expect(res.body.message).toBe('Validation Failed');
      });
    });
  });
});
