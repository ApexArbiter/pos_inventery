import express from "express";

// Import Controllers
import * as authController from "../controllers/auth.controller.enhanced.js";
import * as storeController from "../controllers/store.controller.js";
import * as productController from "../controllers/product.controller.enhanced.js";
import * as inventoryController from "../controllers/inventory.controller.js";
import * as billingController from "../controllers/billing.controller.js";
import * as subscriptionController from "../controllers/subscription.controller.js";

// Import Middleware
import {
  authenticate,
  requireRole,
  requirePermission,
  requireStoreAccess,
  validateSubscription,
  requireFeature,
  validateLimit,
  rateLimitByPlan,
  requireSuperAdmin,
  requireStoreAdmin,
  requireBillingAccess,
  requireInventoryAccess,
  auditLog,
} from "../middleware/auth.middleware.enhanced.js";

const router = express.Router();

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Public routes (no authentication required)
router.post("/auth/register-store", authController.registerStore);
router.post("/auth/login", authController.login);
router.post("/auth/forgot-password", authController.forgotPassword);

// Protected routes (authentication required)
router.use("/auth", authenticate);
router.get("/auth/me", authController.checkAuth);
router.post("/auth/refresh", authController.refreshToken);
router.post("/auth/logout", authController.logout);
router.put("/auth/profile", authController.updateProfile);
router.post("/auth/change-password", authController.changePassword);

// Staff user management (admin only)
router.post("/auth/staff", requireStoreAdmin, validateLimit("maxUsers"), authController.createStaffUser);

// ==========================================
// STORE MANAGEMENT ROUTES
// ==========================================

router.use("/stores", authenticate, validateSubscription);

// Get all stores (super admin only)
router.get("/stores", requireSuperAdmin, storeController.getAllStores);

// Store operations
router.get("/stores/:storeId", requireStoreAccess, storeController.getStoreDetails);
router.put("/stores/:storeId", requireStoreAccess, requirePermission("manage_store"), auditLog("update_store"), storeController.updateStore);
router.put("/stores/:storeId/branding", requireStoreAccess, requirePermission("manage_store"), requireFeature("customBranding"), storeController.updateStoreBranding);

// Store settings
router.get("/stores/:storeId/settings", requireStoreAccess, storeController.getStoreSettings);
router.put("/stores/:storeId/settings", requireStoreAccess, requirePermission("manage_settings"), storeController.updateStoreSettings);

// Dashboard and analytics
router.get("/stores/dashboard", requirePermission("view_dashboard"), storeController.getStoreDashboard);
router.get("/stores/:storeId/users", requireStoreAccess, requirePermission("manage_users"), storeController.getStoreUsers);

// Super admin only operations
router.put("/stores/:storeId/status", requireSuperAdmin, auditLog("toggle_store_status"), storeController.toggleStoreStatus);
router.delete("/stores/:storeId", requireSuperAdmin, auditLog("delete_store"), storeController.deleteStore);

// ==========================================
// PRODUCT MANAGEMENT ROUTES
// ==========================================

router.use("/products", authenticate, validateSubscription, requireInventoryAccess);

// Product CRUD operations
router.get("/products", requirePermission("manage_products"), productController.getAllProducts);
router.get("/products/search", requirePermission("manage_products"), productController.searchProducts);
router.get("/products/categories", requirePermission("manage_categories"), productController.getProductCategories);
router.get("/products/brands", requirePermission("manage_products"), productController.getProductBrands);
router.get("/products/:productId", requirePermission("manage_products"), productController.getProductById);
router.get("/products/barcode/:barcode", requirePermission("manage_products"), requireFeature("barcodeScanning"), productController.getProductByBarcode);

router.post("/products", requirePermission("manage_products"), validateLimit("maxProducts"), auditLog("create_product"), productController.createProduct);
router.put("/products/:productId", requirePermission("manage_products"), auditLog("update_product"), productController.updateProduct);
router.delete("/products/:productId", requirePermission("manage_products"), auditLog("delete_product"), productController.deleteProduct);

// Barcode operations
router.post("/products/:productId/barcode", requirePermission("manage_products"), requireFeature("barcodeScanning"), auditLog("generate_barcode"), productController.generateBarcode);

// Bulk operations
router.post("/products/bulk-import", requirePermission("manage_products"), validateLimit("maxProducts"), auditLog("bulk_import_products"), productController.bulkImportProducts);

// ==========================================
// INVENTORY MANAGEMENT ROUTES
// ==========================================

router.use("/inventory", authenticate, validateSubscription, requireInventoryAccess);

// Inventory overview and management
router.get("/inventory", requirePermission("manage_inventory"), requireFeature("inventoryManagement"), inventoryController.getInventoryOverview);
router.get("/inventory/summary", requirePermission("view_dashboard"), requireFeature("inventoryManagement"), inventoryController.getInventorySummary);
router.get("/inventory/alerts", requirePermission("manage_inventory"), requireFeature("inventoryManagement"), inventoryController.getLowStockAlerts);
router.get("/inventory/reports", requirePermission("view_reports"), requireFeature("inventoryManagement"), inventoryController.generateInventoryReport);

// Product-specific inventory operations
router.get("/inventory/:productId", requirePermission("manage_inventory"), inventoryController.getProductInventory);
router.get("/inventory/:productId/movements", requirePermission("manage_inventory"), inventoryController.getStockMovements);

// Stock management operations
router.post("/inventory/:productId/add", requirePermission("manage_inventory"), auditLog("add_stock"), inventoryController.addStock);
router.post("/inventory/:productId/remove", requirePermission("manage_inventory"), auditLog("remove_stock"), inventoryController.removeStock);
router.post("/inventory/:productId/adjust", requirePermission("manage_inventory"), auditLog("adjust_stock"), inventoryController.adjustStock);

// Advanced operations
router.post("/inventory/:productId/transfer", requirePermission("manage_inventory"), requireFeature("multiStore"), auditLog("transfer_stock"), inventoryController.transferStock);

// ==========================================
// BILLING/POS ROUTES
// ==========================================

router.use("/billing", authenticate, validateSubscription, requireBillingAccess);

// Transaction operations
router.get("/billing/dashboard", requirePermission("view_dashboard"), billingController.getPosDashboard);
router.get("/billing/transactions", requirePermission("process_bills"), billingController.getAllTransactions);
router.get("/billing/transactions/:transactionId", requirePermission("process_bills"), billingController.getTransactionById);
router.get("/billing/bills/:billNumber", requirePermission("process_bills"), billingController.getTransactionByBillNumber);

// Create and process transactions
router.post("/billing/transactions", requirePermission("process_bills"), validateLimit("maxTransactions"), auditLog("create_transaction"), billingController.createTransaction);
router.post("/billing/transactions/:transactionId/return", requirePermission("process_bills"), auditLog("process_return"), billingController.processReturn);

// WhatsApp integration
router.post("/billing/transactions/:transactionId/whatsapp", requirePermission("process_bills"), requireFeature("whatsappIntegration"), auditLog("send_whatsapp_bill"), billingController.sendBillViaWhatsApp);

// Reports and analytics
router.get("/billing/reports", requirePermission("view_reports"), requireFeature("analytics"), billingController.getSalesReports);

// ==========================================
// SUBSCRIPTION MANAGEMENT ROUTES
// ==========================================

router.use("/subscription", authenticate);

// Get subscription status (all authenticated users)
router.get("/subscription/status", subscriptionController.getSubscriptionStatus);
router.get("/subscription/features", subscriptionController.getAvailableFeatures);
router.get("/subscription/:storeId/payments", subscriptionController.getPaymentHistory);

// Subscription management (store admin and above)
router.post("/subscription/:storeId/renew", requireStoreAdmin, auditLog("renew_subscription"), subscriptionController.renewSubscription);
router.post("/subscription/:storeId/change-plan", requireStoreAdmin, auditLog("change_plan"), subscriptionController.changePlan);
router.post("/subscription/:storeId/cancel", requireStoreAdmin, auditLog("cancel_subscription"), subscriptionController.cancelSubscription);

// Super admin only routes
router.get("/subscription/all", requireSuperAdmin, subscriptionController.getAllSubscriptions);
router.get("/subscription/analytics", requireSuperAdmin, subscriptionController.getSubscriptionAnalytics);
router.post("/subscription/reminders", requireSuperAdmin, subscriptionController.sendRenewalReminders);

// ==========================================
// CUSTOMER MANAGEMENT ROUTES (if needed)
// ==========================================

// TODO: Add customer management routes in next phase

// ==========================================
// CATEGORY MANAGEMENT ROUTES
// ==========================================

// TODO: Add category management routes in next phase

// ==========================================
// BARCODE SCANNING ROUTES
// ==========================================

router.use("/barcode", authenticate, validateSubscription, requireFeature("barcodeScanning"));

// Barcode scanning operations
router.post("/barcode/scan", requireBillingAccess, productController.getProductByBarcode);
router.post("/barcode/generate", requireInventoryAccess, requirePermission("manage_products"), productController.generateBarcode);

// ==========================================
// RATE LIMITED ROUTES
// ==========================================

// Apply rate limiting to API-heavy endpoints
router.use("/api", rateLimitByPlan);

// ==========================================
// HEALTH CHECK ROUTES
// ==========================================

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "POS API is healthy",
    timestamp: new Date(),
    version: "2.0.0",
  });
});

// API Info endpoint
router.get("/info", (req, res) => {
  res.status(200).json({
    success: true,
    api: {
      name: "Supermarket POS & Inventory Management API",
      version: "2.0.0",
      description: "Complete POS and inventory management system with barcode scanning and WhatsApp integration",
      features: [
        "Multi-store support",
        "Role-based access control",
        "Barcode scanning integration",
        "Real-time inventory management",
        "WhatsApp bill delivery",
        "Subscription management",
        "Advanced analytics",
      ],
    },
    endpoints: {
      auth: "/auth/*",
      stores: "/stores/*",
      products: "/products/*",
      inventory: "/inventory/*",
      billing: "/billing/*",
      subscription: "/subscription/*",
      barcode: "/barcode/*",
    },
  });
});

export default router;
