import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getAllCategories,    
  createCategory,      
  deleteCategory,      
} from "../controllers/product.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// IMPORTANT: Put specific routes BEFORE parameterized routes
router.get("/categories", protectRoute, getAllCategories);
router.post("/categories", protectRoute, createCategory);
router.delete("/categories/:id", protectRoute, deleteCategory);

// General product routes
router.get("/", protectRoute, getAllProducts);
router.get("/category/:category", protectRoute, getProductsByCategory);

// Product CRUD operations
router.post("/", protectRoute, createProduct); // Removed duplicate protectRoute
router.put("/:id", protectRoute, updateProduct); // Removed duplicate protectRoute
router.delete("/:id", protectRoute, deleteProduct); // Removed duplicate protectRoute

// This should be LAST because it catches any /:id pattern
router.get("/:id", protectRoute, getProductById);

export default router;