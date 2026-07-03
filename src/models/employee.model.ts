import { Model, DataTypes, Sequelize } from 'sequelize';

export class Employee extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public employeeCode!: string;
  public cardUid!: string | null;
  public biometricId!: number | null;
  public department!: string | null;
  public hasAccess!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initEmployee(sequelize: Sequelize) {
  Employee.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      employeeCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'employee_code',
      },
      cardUid: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'card_uid',
      },
      biometricId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
        field: 'biometric_id',
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hasAccess: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'has_access',
      },
    },
    {
      sequelize,
      tableName: 'employees',
    }
  );
}
