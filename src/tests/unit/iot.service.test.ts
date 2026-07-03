import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as iotService from '../../services/iot.service.js';
import { Employee, AccessLog } from '../../models/index.js';
import { DeviceTypeEnum } from '../../models/access_log.model.js';

// Mock the models layer
vi.mock('../../models/index.js', () => {
  return {
    Employee: {
      findOne: vi.fn(),
    },
    AccessLog: {
      create: vi.fn(),
      findAndCountAll: vi.fn(),
    },
    redisClient: {
      get: vi.fn(),
      set: vi.fn(),
      isOpen: false,
    },
    sequelize: {
      authenticate: vi.fn(),
    },
  };
});

describe('IoT Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processRfidScan', () => {
    it('should grant access and save logs when employee card UID matches in database', async () => {
      // Mock findOne to return a registered employee
      vi.mocked(Employee.findOne).mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        employeeCode: 'EMP-101',
        department: 'Engineering',
      } as any);

      // Mock AccessLog.create
      vi.mocked(AccessLog.create).mockResolvedValue({
        id: 10,
        employeeId: 1,
        deviceId: 'GATE_01_RFID',
        deviceType: DeviceTypeEnum.RFID,
        direction: 'in',
        status: 'granted',
        createdAt: new Date(),
      } as any);

      const result = await iotService.processRfidScan({
        cardUid: 'card_john',
        deviceId: 'GATE_01_RFID',
        direction: 'in',
      });

      expect(Employee.findOne).toHaveBeenCalledWith({
        where: { cardUid: 'card_john' },
        attributes: ['id', 'name', 'email', 'employeeCode', 'department', 'hasAccess'],
        raw: true,
      });

      expect(AccessLog.create).toHaveBeenCalledWith({
        employeeId: 1,
        deviceId: 'GATE_01_RFID',
        deviceType: 'rfid',
        direction: 'in',
        status: 'granted',
        capturedImage: null,
      });

      expect(result.status).toBe('granted');
      expect(result.employee).not.toBeNull();
      expect(result.employee?.name).toBe('John Doe');
    });

    it('should deny access and log visitor attempt when card UID is not in database', async () => {
      // Mock findOne to return null (unregistered card)
      vi.mocked(Employee.findOne).mockResolvedValue(null);

      vi.mocked(AccessLog.create).mockResolvedValue({
        id: 11,
        employeeId: null,
        deviceId: 'GATE_01_RFID',
        deviceType: DeviceTypeEnum.RFID,
        direction: 'in',
        status: 'denied',
        createdAt: new Date(),
      } as any);

      const result = await iotService.processRfidScan({
        cardUid: 'card_unknown',
        deviceId: 'GATE_01_RFID',
        direction: 'in',
      });

      expect(AccessLog.create).toHaveBeenCalledWith({
        employeeId: null,
        deviceId: 'GATE_01_RFID',
        deviceType: 'rfid',
        direction: 'in',
        status: 'denied',
        capturedImage: null,
      });

      expect(result.status).toBe('denied');
      expect(result.employee).toBeNull();
    });

    it('should deny access and log employee attempt when card UID matches but employee hasAccess is false', async () => {
      // Mock findOne to return employee with hasAccess = false
      vi.mocked(Employee.findOne).mockResolvedValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        employeeCode: 'EMP-101',
        department: 'Engineering',
        hasAccess: false,
      } as any);

      vi.mocked(AccessLog.create).mockResolvedValue({
        id: 12,
        employeeId: 1,
        deviceId: 'GATE_01_RFID',
        deviceType: DeviceTypeEnum.RFID,
        direction: 'in',
        status: 'denied',
        createdAt: new Date(),
      } as any);

      const result = await iotService.processRfidScan({
        cardUid: 'card_john',
        deviceId: 'GATE_01_RFID',
        direction: 'in',
      });

      expect(Employee.findOne).toHaveBeenCalledWith({
        where: { cardUid: 'card_john' },
        attributes: ['id', 'name', 'email', 'employeeCode', 'department', 'hasAccess'],
        raw: true,
      });

      expect(AccessLog.create).toHaveBeenCalledWith({
        employeeId: 1,
        deviceId: 'GATE_01_RFID',
        deviceType: 'rfid',
        direction: 'in',
        status: 'denied',
        capturedImage: null,
      });

      expect(result.status).toBe('denied');
      expect(result.employee).not.toBeNull();
      expect(result.employee?.name).toBe('John Doe');
    });
  });
});
