import { Router } from 'express';
import * as authController from '../../controllers/auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rbacMiddleware } from '../../middleware/rbac.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../../schemas/auth.schema.js';

const router = Router();

router.post('/register', validate(registerSchema, 'body'), authController.register);
router.post('/login', validate(loginSchema, 'body'), authController.login);
router.post('/refresh', validate(refreshTokenSchema, 'body'), authController.refresh);
router.post('/logout', validate(refreshTokenSchema, 'body'), authController.logout);

// Restricted Admin users list route
router.get('/admin/users', authMiddleware, rbacMiddleware(['admin']), authController.getUsers);

export default router;
