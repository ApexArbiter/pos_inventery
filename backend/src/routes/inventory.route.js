import express from 'express';
import {
  getInventoryLevels,
  getInventoryValue,
  getLowStockItems,
  getOutOfStockItems,
  getInventoryMovements,
  getInventoryByProduct,
  adjustInventory,
  transferStock,
  updateReorderPoint,
  getInventoryReports,
  getStockHistory
} from '../controllers/inventory.controller.js';

const router = express.Router();

// Inventory routes
router.get('/levels', getInventoryLevels);
router.get('/value', getInventoryValue);
router.get('/low-stock', getLowStockItems);
router.get('/out-of-stock', getOutOfStockItems);
router.get('/movements', getInventoryMovements);
router.get('/movements/recent', (req, res) => {
  req.query.limit = 10;
  getInventoryMovements(req, res);
});
router.get('/product/:productId', getInventoryByProduct);
router.get('/history/:productId', getStockHistory);
router.post('/adjust', adjustInventory);
router.post('/transfer', transferStock);
router.patch('/reorder-point/:productId', updateReorderPoint);
router.get('/reports', getInventoryReports);
router.get('/reports/top-products', (req, res) => {
  req.query.limit = 10;
  getInventoryReports(req, res);
});

export default router;
