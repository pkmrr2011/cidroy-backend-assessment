import { sequelize } from '../config/database.js';
import { Employee, initEmployee } from './employee.model.js';
import { AccessLog, initAccessLog } from './access_log.model.js';
import { User, initUser } from './user.model.js';
import { RefreshToken, initRefreshToken } from './refresh_token.model.js';
import { Product, initProduct } from './product.model.js';

// 1. Initialize models
initEmployee(sequelize);
initAccessLog(sequelize);
initUser(sequelize);
initRefreshToken(sequelize);
initProduct(sequelize);

// 2. Define associations

// Employee <-> AccessLog
Employee.hasMany(AccessLog, { foreignKey: 'employee_id', as: 'accessLogs', onDelete: 'CASCADE' });
AccessLog.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// User <-> RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { sequelize, Employee, AccessLog, User, RefreshToken, Product };
export default {
  sequelize,
  Employee,
  AccessLog,
  User,
  RefreshToken,
  Product,
};
