import express from 'express';
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

const router = express.Router();

// IMPORTANT: Put specific routes BEFORE parameterized routes
router.get("/categories", getAllCategories);
router.post("/categories", createCategory);
router.delete("/categories/:id", deleteCategory);

// General product routes
router.get("/", getAllProducts);
router.get("/category/:category", getProductsByCategory);

// Product CRUD operations
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// This should be LAST because it catches any /:id pattern
router.get("/:id", getProductById);

export default router;