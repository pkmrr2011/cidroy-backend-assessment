import { Router } from 'express';
import * as productController from '../../controllers/product.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rbacMiddleware } from '../../middleware/rbac.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  patchProductSchema,
} from '../../schemas/product.schema.js';

const router = Router();

// Retrieve products (All authenticated users allowed)
router.get('/', authMiddleware, productController.list);
router.get('/:id', authMiddleware, productController.getById);

// Create, Update, and Delete products (Admin and Manager only)
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'manager']),
  validate(createProductSchema, 'body'),
  productController.create
);

router.put(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'manager']),
  validate(updateProductSchema, 'body'),
  productController.update
);

router.patch(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'manager']),
  validate(patchProductSchema, 'body'),
  productController.partialUpdate
);

router.delete(
  '/:id',
  authMiddleware,
  rbacMiddleware(['admin', 'manager']),
  productController.remove
);

export default router;
