// routes/order.routes.js - SIMPLIFIED (REMOVED PDF ROUTES)
import express from "express";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  confirmOrder,
  deleteOrder,
  getOrderStats,
  getOrdersByDateRange,
  sendBillViaWhatsApp, // Only WhatsApp bill sending - no PDF routes
} from "../controllers/order.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.get("/", protectRoute, getAllOrders);
router.get("/stats", protectRoute, getOrderStats);
router.get("/date-range", protectRoute, getOrdersByDateRange);
router.get("/:id", protectRoute, getOrderById);
// REMOVED: router.get("/:id/bill-pdf", protectRoute, getBillPDF); // No longer needed
router.post("/", protectRoute, createOrder);
router.post("/:id/send-bill", protectRoute, sendBillViaWhatsApp); // Simplified - only sends WhatsApp
router.put("/:id", protectRoute, updateOrder);
router.patch("/:id/status", protectRoute, updateOrderStatus);
router.patch("/:id/confirm", protectRoute, confirmOrder);
router.delete("/:id", protectRoute, deleteOrder);

export default router;