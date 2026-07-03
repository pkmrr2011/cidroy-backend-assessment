import { sequelize } from '../config/database.js';
import { Employee, initEmployee } from './employee.model.js';
import { AccessLog, initAccessLog } from './access_log.model.js';

// 1. Initialize models
initEmployee(sequelize);
initAccessLog(sequelize);

// 2. Define associations

// Employee <-> AccessLog
Employee.hasMany(AccessLog, { foreignKey: 'employee_id', as: 'accessLogs', onDelete: 'CASCADE' });
AccessLog.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

export { sequelize, Employee, AccessLog };
export default {
  sequelize,
  Employee,
  AccessLog,
};
