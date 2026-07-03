import * as iotService from '../services/iot.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const handleRfidScan = asyncHandler(async (req, res) => {
  const result = await iotService.processRfidScan(req.body);
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const handleBiometricScan = asyncHandler(async (req, res) => {
  const result = await iotService.processBiometricScan(req.body);
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const handleCameraTrigger = asyncHandler(async (req, res) => {
  const result = await iotService.processCameraFaceTrigger(req.body);
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const fetchLogs = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const filters: any = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.deviceType) filters.deviceType = req.query.deviceType;

  const { logs, total } = await iotService.getAccessLogs(filters, page, limit);

  res.status(200).json({
    status: 'success',
    data: logs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});
