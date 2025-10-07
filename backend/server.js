import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

// Load environment variables
dotenv.config();

// Database connection
import { connectDB } from "./src/config/database.js";

// Import models
import User from "./src/models/user.model.js";
import Store from "./src/models/store.model.js";
import Category from "./src/models/category.model.js";
import Product from "./src/models/product.model.js";
import Customer from "./src/models/customer.model.js";
import Transaction from "./src/models/transaction.model.js";
import Inventory from "./src/models/inventory.model.js";
import { uploadImage } from "./src/lib/cloudinary.js";

// Import routes
import productRoutes from "./src/routes/product.route.js";
import inventoryRoutes from "./src/routes/inventory.route.js";

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://tauri.localhost",
  "http://localhost",
  "http://tauri.localhost",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-store-id",
      "Accept",
      "Origin",
    ],
  })
);

// Connect to MongoDB
connectDB();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT,
  });
});

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);

// Auth endpoints
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log(`👤 User found: ${user ? "YES" : "NO"}`);

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password (simple string comparison for now)
    const isMatch = password === user.password;
    console.log(
      `🔍 Password check for ${email}: ${isMatch ? "SUCCESS" : "FAILED"}`
    );

    if (!isMatch) {
      console.log(`❌ Password mismatch for ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Get store information
    const store = await Store.findById(user.storeId);
    console.log(`🏪 Store found: ${store ? "YES" : "NO"}`);

    if (!store) {
      console.log(`❌ Store not found for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Store not found",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        permissions: user.permissions || [],
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    console.log(`✅ Login successful for: ${email}`);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.fullName || user.name,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions || [],
        },
        store: {
          id: store._id,
          name: store.name,
          storeId: store.storeId,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Signup endpoint
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, role = "billing_staff" } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and name are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Get the demo store
    const store = await Store.findOne({ storeId: "DEMO001" });
    if (!store) {
      return res.status(400).json({
        success: false,
        message: "Demo store not found",
      });
    }

    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      password: password, // Store as plain text for now
      name,
      role,
      storeId: store._id,
      permissions:
        role === "super_admin"
          ? [
              "view_dashboard",
              "manage_products",
              "manage_customers",
              "process_bills",
              "manage_inventory",
              "view_reports",
              "manage_users",
              "manage_stores",
            ]
          : ["view_dashboard", "process_bills"],
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
        storeId: newUser.storeId,
        permissions: newUser.permissions,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.fullName || newUser.name,
          fullName: newUser.fullName,
          role: newUser.role,
          permissions: newUser.permissions,
        },
        store: {
          id: store._id,
          name: store.name,
          storeId: store.storeId,
        },
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get current user endpoint
app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId);
    const store = await Store.findById(decoded.storeId);

    if (!user || !store) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.fullName || user.name,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions || [],
        },
        store: {
          id: store._id,
          name: store.name,
          storeId: store.storeId,
        },
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
});

// Categories API endpoints
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Categories error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch categories" });
  }
});

// Customer API endpoints
app.get("/api/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error("Customers error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch customers" });
  }
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// Transactions API
app.get("/api/transactions", async (req, res) => {
  try {
    console.log("Fetching transactions...");
    const transactions = await Transaction.find().sort({ createdAt: -1 });

    console.log(`Found ${transactions.length} transactions`);
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const transactionData = req.body;

    // Validate required fields
    if (!transactionData.items || transactionData.items.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Transaction must have at least one item",
        });
    }

    if (!transactionData.storeId) {
      return res
        .status(400)
        .json({ success: false, message: "Store ID is required" });
    }

    // Create transaction
    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Update inventory for each item
    for (const item of transactionData.items) {
      try {
        // Find existing inventory record
        let inventory = await Inventory.findOne({
          product: item.product,
          storeId: transactionData.storeId,
        });

        if (inventory) {
          // Update existing inventory
          inventory.currentStock -= item.quantity;
          inventory.lastUpdated = new Date();

          // Add movement record
          inventory.movements.push({
            type: "sale",
            quantity: -item.quantity,
            reason: "POS Sale",
            reference: transaction._id,
            timestamp: new Date(),
          });

          await inventory.save();
        } else {
          // Create new inventory record (this shouldn't happen in normal flow)
          console.warn(
            `No inventory record found for product ${item.product} in store ${transactionData.storeId}`
          );
        }

        // Also update product stock if it exists
        await Product.findByIdAndUpdate(item.product, {
          $inc: { currentStock: -item.quantity },
        });
      } catch (itemError) {
        console.error(
          `Error updating inventory for item ${item.product}:`,
          itemError
        );
        // Continue with other items even if one fails
      }
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create transaction" });
  }
});

// Revenue tracking API
app.get("/api/revenue", async (req, res) => {
  try {
    const { period = "today", storeId } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
    }

    const query = {
      createdAt: { $gte: startDate, $lt: endDate },
      type: "sale",
      paymentStatus: "paid",
    };

    if (storeId) {
      query.storeId = storeId;
    }

    const transactions = await Transaction.find(query);

    const totalRevenue = transactions.reduce(
      (sum, transaction) => sum + transaction.finalAmount,
      0
    );
    const totalTransactions = transactions.length;
    const averageOrderValue =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Top selling products
    const productSales = {};
    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        if (productSales[item.productName]) {
          productSales[item.productName] += item.quantity;
        } else {
          productSales[item.productName] = item.quantity;
        }
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        averageOrderValue,
        topProducts,
        period,
        dateRange: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch revenue data" });
  }
});

// Returns/Refunds API
app.post("/api/returns", async (req, res) => {
  try {
    const { transactionId, items, reason } = req.body;

    // Create return transaction
    const returnTransaction = new Transaction({
      ...req.body,
      type: "return",
      billNumber: `RET-${Date.now()}`,
      status: "completed",
      paymentMethod: "cash",
      paymentStatus: "refunded",
    });

    await returnTransaction.save();

    // Update inventory (add back the returned items)
    for (const item of returnTransaction.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product, storeId: returnTransaction.storeId },
        { $inc: { currentStock: item.quantity } },
        { upsert: true }
      );
    }

    res.json({ success: true, data: returnTransaction });
  } catch (error) {
    console.error("Error processing return:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to process return" });
  }
});

// Image upload API
app.post("/api/upload/image", upload.single("image"), async (req, res) => {
  try {
    console.log("Image upload request received:", {
      hasFile: !!req.file,
      fileInfo: req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
          }
        : null,
      body: req.body,
    });

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });
    }

    const folder = req.body.folder || "general";
    console.log("Uploading to Cloudinary with folder:", folder);

    // Upload to Cloudinary
    const result = await uploadImage(req.file.path, folder);
    console.log("Cloudinary upload successful:", result.secure_url);

    // Clean up local file
    try {
      fs.unlinkSync(req.file.path);
      console.log("Local file cleaned up");
    } catch (cleanupError) {
      console.warn("Failed to clean up local file:", cleanupError);
    }

    res.json({
      success: true,
      data: {
        secure_url: result.secure_url,
        public_id: result.public_id,
      },
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to upload image: " + error.message,
      });
  }
});

// Update inventory product details endpoint
app.post("/api/inventory/update-product-details", async (req, res) => {
  try {
    console.log("🔄 Updating inventory records with product details...");

    // Get all inventory records
    const inventoryRecords = await Inventory.find({});
    console.log(`Found ${inventoryRecords.length} inventory records`);

    let updatedCount = 0;

    for (const inventory of inventoryRecords) {
      // Get the product details
      const product = await Product.findById(inventory.productId);

      if (product) {
        // Update the inventory record with product details
        inventory.productDetails = {
          productName: product.productName || product.name,
          barcode: product.barcode,
          description: product.description,
          category: product.category,
          mrp: product.mrp,
          sellingPrice: product.sellingPrice || product.price || 0,
          costPrice: product.costPrice || 0,
          unit: product.unit,
          images: product.images || [],
          isActive: product.isActive,
          isReturnable: product.isReturnable,
          minStockLevel: product.minStockLevel || 10,
          maxStockLevel: product.maxStockLevel || 100,
          reorderPoint: product.reorderPoint || 15,
        };

        // Fix missing storeId
        if (!inventory.storeId) {
          inventory.storeId = product.storeId || "68d9b866b68fb44566d71515";
        }

        // Initialize stockMovements if it doesn't exist
        if (!inventory.stockMovements) {
          inventory.stockMovements = [];
        }

        // Update availableStock
        inventory.availableStock = Math.max(0, inventory.currentStock || 0);

        await inventory.save();
        updatedCount++;
        console.log(`✅ Updated inventory for product: ${product.productName}`);
      } else {
        console.log(`❌ Product not found for inventory ID: ${inventory._id}`);
      }
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} inventory records`,
      updatedCount,
    });
  } catch (error) {
    console.error("❌ Error updating inventory:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update inventory: " + error.message,
      });
  }
});

// Inventory history endpoint (temporary fix)
app.get("/api/inventory/history/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const inventory = await Inventory.findOne({ productId });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    const movements = (inventory.stockMovements || []).map((movement) => ({
      ...movement.toObject(),
      productName: inventory.productDetails?.productName || "Unknown Product",
      barcode: inventory.productDetails?.barcode || "N/A",
    }));

    // Sort by timestamp (newest first)
    movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, data: movements });
  } catch (error) {
    console.error("Error fetching stock history:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch stock history" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Starting SuperMarket POS API Server`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
  console.log(`🚀 SuperMarket POS API Server is ready!`);
});

export default app;
