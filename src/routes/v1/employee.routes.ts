import { Router } from 'express';
import * as employeeController from '../../controllers/employee.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { getEmployeesQuerySchema, updateAccessBodySchema } from '../../schemas/employee.schema.js';

const router = Router();

router.get('/', validate(getEmployeesQuerySchema, 'query'), employeeController.getEmployees);
router.patch(
  '/:id/access',
  validate(updateAccessBodySchema, 'body'),
  employeeController.updateAccess
);

export default router;
