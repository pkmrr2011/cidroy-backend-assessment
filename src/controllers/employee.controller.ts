import { Op } from 'sequelize';
import { Employee } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

import { AppError } from '../middleware/error.middleware.js';

export const getEmployees = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const where: any = {};

  if (req.query.hasAccess !== undefined) {
    where.hasAccess = req.query.hasAccess;
  }

  if (req.query.search) {
    const searchStr = `%${req.query.search}%`;
    where[Op.or] = [
      { name: { [Op.like]: searchStr } },
      { email: { [Op.like]: searchStr } },
      { employeeCode: { [Op.like]: searchStr } },
      { department: { [Op.like]: searchStr } },
    ];
  }

  const { rows: employees, count: total } = await Employee.findAndCountAll({
    where,
    offset,
    limit,
    order: [['id', 'ASC']],
    raw: true,
  });

  res.status(200).json({
    status: 'success',
    data: employees,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const updateAccess = asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);
  const { hasAccess } = req.body;

  const employee = await Employee.findByPk(id);
  if (!employee) {
    return next(new AppError(`Employee with ID ${id} not found`, 404));
  }

  await employee.update({ hasAccess });

  // Cache Invalidation
  try {
    if (redisClient.isOpen) {
      const cardUid = employee.cardUid;
      const biometricId = employee.biometricId;
      const email = employee.email;

      const deletePromises: Promise<any>[] = [];

      if (cardUid) {
        deletePromises.push(redisClient.del(`rfid_${cardUid}`));
      }
      if (biometricId) {
        deletePromises.push(redisClient.del(`bio_${biometricId}`));
      }
      if (email) {
        deletePromises.push(redisClient.del(`face_${email}`));
      }

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        logger.info(`Cleared Redis cache for employee ID ${id}`);
      }
    }
  } catch (err: any) {
    logger.warn(`Failed to invalidate cache for employee ID ${id}: ${err.message}`);
  }

  res.status(200).json({
    status: 'success',
    data: employee,
  });
});
