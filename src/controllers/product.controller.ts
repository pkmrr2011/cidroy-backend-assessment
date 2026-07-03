import { Op } from 'sequelize';
import { Product } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/error.middleware.js';

export const list = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const where: any = {};

  if (req.query.category) {
    where.category = req.query.category;
  }

  if (req.query.isActive !== undefined) {
    where.isActive = req.query.isActive;
  }

  if (req.query.search) {
    const searchStr = `%${req.query.search}%`;
    where[Op.or] = [{ name: { [Op.like]: searchStr } }, { description: { [Op.like]: searchStr } }];
  }

  const { rows: products, count: total } = await Product.findAndCountAll({
    where,
    offset,
    limit,
    order: [['id', 'DESC']],
    raw: true,
  });

  // Set the requested X-Total-Count header
  res.setHeader('X-Total-Count', total);

  res.status(200).json({
    status: 'success',
    data: products,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getById = asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);

  const product = await Product.findByPk(id, { raw: true });
  if (!product) {
    return next(new AppError(`Product with ID ${id} not found`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: product,
  });
});

export const create = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category, isActive } = req.body;

  const product = await Product.create({
    name,
    description: description || null,
    price,
    stock: stock !== undefined ? stock : 0,
    category,
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    status: 'success',
    data: product,
  });
});

export const update = asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);
  const { name, description, price, stock, category, isActive } = req.body;

  const product = await Product.findByPk(id);
  if (!product) {
    return next(new AppError(`Product with ID ${id} not found`, 404));
  }

  await product.update({
    name,
    description: description || null,
    price,
    stock,
    category,
    isActive,
  });

  res.status(200).json({
    status: 'success',
    data: product,
  });
});

export const partialUpdate = asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);

  const product = await Product.findByPk(id);
  if (!product) {
    return next(new AppError(`Product with ID ${id} not found`, 404));
  }

  await product.update(req.body);

  res.status(200).json({
    status: 'success',
    data: product,
  });
});

export const remove = asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);

  const product = await Product.findByPk(id);
  if (!product) {
    return next(new AppError(`Product with ID ${id} not found`, 404));
  }

  // Paranoid model: this will execute a soft delete (updating deleted_at)
  await product.destroy();

  res.status(200).json({
    status: 'success',
    message: 'Product soft-deleted successfully',
  });
});
