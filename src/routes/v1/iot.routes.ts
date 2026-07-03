import { Router } from 'express';
import * as iotController from '../../controllers/iot.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  rfidScanSchema,
  biometricScanSchema,
  cameraTriggerSchema,
  accessLogQuerySchema,
} from '../../schemas/iot.schema.js';

const router = Router();

router.post('/rfid-scan', validate(rfidScanSchema), iotController.handleRfidScan);

router.post('/biometric-scan', validate(biometricScanSchema), iotController.handleBiometricScan);

router.post('/camera-trigger', validate(cameraTriggerSchema), iotController.handleCameraTrigger);

router.get('/logs', validate(accessLogQuerySchema, 'query'), iotController.fetchLogs);

export default router;
