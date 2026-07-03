import { Model, DataTypes, Sequelize } from 'sequelize';

export enum DeviceTypeEnum {
  RFID = 'rfid',
  BIOMETRIC = 'biometric',
  FACE_RECOGNITION = 'face_recognition',
}

export enum DirectionEnum {
  IN = 'in',
  OUT = 'out',
}

export enum AccessStatusEnum {
  GRANTED = 'granted',
  DENIED = 'denied',
}

export class AccessLog extends Model {
  public id!: number;
  public employeeId!: number | null;
  public deviceId!: string;
  public deviceType!: DeviceTypeEnum;
  public direction!: DirectionEnum;
  public status!: AccessStatusEnum;
  public capturedImage!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initAccessLog(sequelize: Sequelize) {
  AccessLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'employee_id',
      },
      deviceId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'device_id',
      },
      deviceType: {
        type: DataTypes.ENUM(...Object.values(DeviceTypeEnum)),
        allowNull: false,
        field: 'device_type',
      },
      direction: {
        type: DataTypes.ENUM(...Object.values(DirectionEnum)),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(AccessStatusEnum)),
        allowNull: false,
      },
      capturedImage: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'captured_image',
      },
    },
    {
      sequelize,
      tableName: 'access_logs',
      indexes: [
        {
          name: 'idx_access_logs_created_at',
          fields: ['created_at'],
        },
        {
          name: 'idx_access_logs_device_created',
          fields: ['device_id', 'created_at'],
        },
        {
          name: 'idx_access_logs_employee_id',
          fields: ['employee_id'],
        },
      ],
    }
  );
}
