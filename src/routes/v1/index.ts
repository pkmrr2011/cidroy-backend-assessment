import { Router } from 'express';
import healthRoutes from './health.routes.js';
import iotRoutes from './iot.routes.js';
import employeeRoutes from './employee.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/iot', iotRoutes);
router.use('/employees', employeeRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);

export default router;
