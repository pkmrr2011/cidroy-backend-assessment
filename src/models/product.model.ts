import { Model, DataTypes, Sequelize } from 'sequelize';

export class Product extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public price!: number;
  public stock!: number;
  public category!: 'electronics' | 'clothing' | 'food' | 'other';
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

export function initProduct(sequelize: Sequelize) {
  Product.init(
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      category: {
        type: DataTypes.ENUM('electronics', 'clothing', 'food', 'other'),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
    },
    {
      sequelize,
      tableName: 'products',
      underscored: true,
      paranoid: true, // Enable soft deletes
      deletedAt: 'deleted_at',
    }
  );
}
