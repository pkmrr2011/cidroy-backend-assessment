import { sequelize, Employee, AccessLog } from '../models/index.js';
import { DeviceTypeEnum, DirectionEnum, AccessStatusEnum } from '../models/access_log.model.js';
import { logger } from '../config/logger.js';

async function seed() {
  logger.info('Starting database seeding (Safe & Non-Destructive)...');

  await sequelize.authenticate();
  logger.info('Connected to MySQL.');

  logger.info('Syncing database models before seeding...');
  await sequelize.sync({ alter: true });
  logger.info('Database models synced.');

  // 1. Stage 1: Seed Employees safely using findOrCreate (Idempotence)
  logger.info('Stage 1: Seeding employees safely...');

  const employeeData = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      employeeCode: 'EMP-101',
      cardUid: 'card_john',
      biometricId: 1,
      department: 'Engineering',
      hasAccess: true,
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      employeeCode: 'EMP-102',
      cardUid: 'card_jane',
      biometricId: 2,
      department: 'Operations',
      hasAccess: true,
    },
    {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      employeeCode: 'EMP-103',
      cardUid: 'card_bob',
      biometricId: 3,
      department: 'Security',
      hasAccess: true,
    },
  ];

  const employeeResults = await Promise.allSettled(
    employeeData.map((data) =>
      Employee.findOrCreate({
        where: { employeeCode: data.employeeCode },
        defaults: data,
      })
    )
  );

  const john =
    employeeResults[0].status === 'fulfilled' ? (employeeResults[0] as any).value[0] : null;
  const jane =
    employeeResults[1].status === 'fulfilled' ? (employeeResults[1] as any).value[0] : null;
  const bob =
    employeeResults[2].status === 'fulfilled' ? (employeeResults[2] as any).value[0] : null;

  // 2. Stage 2: Seed Access Logs (Only if logs table is currently empty to prevent audit history loss)
  const logsCount = await AccessLog.count();
  if (logsCount === 0) {
    logger.info('Stage 2: Seeding mock access logs safely...');
    const logsToCreate = [];

    if (john) {
      logsToCreate.push(
        AccessLog.create({
          employeeId: john.getDataValue('id'),
          deviceId: 'GATE_01_RFID',
          deviceType: DeviceTypeEnum.RFID,
          direction: DirectionEnum.IN,
          status: AccessStatusEnum.GRANTED,
        })
      );
    }

    if (jane) {
      logsToCreate.push(
        AccessLog.create({
          employeeId: jane.getDataValue('id'),
          deviceId: 'GATE_02_BIO',
          deviceType: DeviceTypeEnum.BIOMETRIC,
          direction: DirectionEnum.IN,
          status: AccessStatusEnum.GRANTED,
        })
      );
    }

    if (bob) {
      logsToCreate.push(
        AccessLog.create({
          employeeId: bob.getDataValue('id'),
          deviceId: 'GATE_03_CAM',
          deviceType: DeviceTypeEnum.FACE_RECOGNITION,
          direction: DirectionEnum.IN,
          status: AccessStatusEnum.GRANTED,
          capturedImage: 'http://cctv.local/snapshots/frame_bob_102.jpg',
        })
      );
    }

    logsToCreate.push(
      AccessLog.create({
        employeeId: null,
        deviceId: 'GATE_01_RFID',
        deviceType: DeviceTypeEnum.RFID,
        direction: DirectionEnum.IN,
        status: AccessStatusEnum.DENIED,
      })
    );

    const results = await Promise.allSettled(logsToCreate);
    results.forEach((res, idx) => {
      if (res.status === 'rejected') {
        logger.error(`Log entry ${idx} creation failed: ${res.reason}`);
      }
    });
    logger.info('Mock access logs seeding process completed.');
  } else {
    logger.info('Access logs already exist. Skipping log seeding to preserve audit history.');
  }

  logger.info('Database seeding completed safely.');
  await sequelize.close();
}

seed().catch((err) => {
  logger.error(`Error during seeding: ${err.message}`);
  process.exit(1);
});
