import { AccessLog, Employee } from '../models/index.js';
import { DeviceTypeEnum, DirectionEnum, AccessStatusEnum } from '../models/access_log.model.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

// Reusable Redis caching helper with resilient MySQL database fallback
async function getCachedEmployee(cacheKey: string, fetchFn: () => Promise<any>) {
  try {
    if (redisClient.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (err: any) {
    logger.warn(`Redis cache read error: ${err.message}. Falling back to database lookup.`);
  }

  const employee = await fetchFn();

  try {
    if (redisClient.isOpen && employee) {
      await redisClient.set(cacheKey, JSON.stringify(employee), { EX: 10 }); // 10-second TTL
    }
  } catch (err: any) {
    logger.warn(`Redis cache write error: ${err.message}.`);
  }

  return employee;
}

// Reusable Access Scan Helper Function
async function processAccessScan(params: {
  lookupQuery: () => Promise<any>;
  deviceType: DeviceTypeEnum;
  deviceId: string;
  direction: string;
  capturedImage?: string | null;
}) {
  const employee = await params.lookupQuery();
  const status =
    employee && employee.hasAccess !== false && employee.hasAccess !== 0
      ? AccessStatusEnum.GRANTED
      : AccessStatusEnum.DENIED;

  const log = await AccessLog.create({
    employeeId: employee ? employee.id : null,
    deviceId: params.deviceId,
    deviceType: params.deviceType,
    direction: params.direction as DirectionEnum,
    status,
    capturedImage: params.capturedImage || null,
  });

  const getVal = (key: string) => {
    return typeof log.getDataValue === 'function' ? log.getDataValue(key) : (log as any)[key];
  };

  return {
    status: getVal('status'),
    direction: getVal('direction'),
    timestamp: getVal('created_at') || getVal('createdAt'),
    capturedImage: getVal('captured_image') || getVal('capturedImage'),
    employee: employee
      ? {
          name: employee.name,
          email: employee.email,
          code: employee.employee_code || employee.employeeCode,
          department: employee.department,
        }
      : null,
  };
}

export const processRfidScan = async (payload: {
  cardUid: string;
  deviceId: string;
  direction: string;
}) => {
  return processAccessScan({
    lookupQuery: () =>
      getCachedEmployee(`rfid_${payload.cardUid}`, () =>
        Employee.findOne({
          where: { cardUid: payload.cardUid },
          attributes: ['id', 'name', 'email', 'employeeCode', 'department', 'hasAccess'],
          raw: true,
        })
      ),
    deviceType: DeviceTypeEnum.RFID,
    deviceId: payload.deviceId,
    direction: payload.direction,
  });
};

export const processBiometricScan = async (payload: {
  biometricId: number;
  deviceId: string;
  direction: string;
}) => {
  return processAccessScan({
    lookupQuery: () =>
      getCachedEmployee(`bio_${payload.biometricId}`, () =>
        Employee.findOne({
          where: { biometricId: payload.biometricId },
          attributes: ['id', 'name', 'email', 'employeeCode', 'department', 'hasAccess'],
          raw: true,
        })
      ),
    deviceType: DeviceTypeEnum.BIOMETRIC,
    deviceId: payload.deviceId,
    direction: payload.direction,
  });
};

export const processCameraFaceTrigger = async (payload: {
  deviceId: string;
  direction: string;
  email: string;
  rtspSnapshot: string;
}) => {
  return processAccessScan({
    lookupQuery: () =>
      getCachedEmployee(`face_${payload.email}`, () =>
        Employee.findOne({
          where: { email: payload.email },
          attributes: ['id', 'name', 'email', 'employeeCode', 'department', 'hasAccess'],
          raw: true,
        })
      ),
    deviceType: DeviceTypeEnum.FACE_RECOGNITION,
    deviceId: payload.deviceId,
    direction: payload.direction,
    capturedImage: payload.rtspSnapshot, // Store URL directly
  });
};

export const getAccessLogs = async (filters: any, page: number, limit: number) => {
  const offset = (page - 1) * limit;

  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.deviceType) where.deviceType = filters.deviceType;

  // Utilize raw: true and nest: true to skip ORM class hydration overhead
  const { rows: logs, count: total } = await AccessLog.findAndCountAll({
    where,
    offset,
    limit,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['name', 'email', 'employeeCode', 'department'],
      },
    ],
    order: [['created_at', 'DESC']],
    raw: true,
    nest: true,
  });

  return { logs, total };
};
