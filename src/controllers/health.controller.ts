import { asyncHandler } from '../utils/asyncHandler.js';

export const check = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      status: 'UP',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});
