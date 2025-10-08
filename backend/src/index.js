import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Database connection
import { connectDB } from './config/database.js';

// Import models
import User from './models/user.model.js';
import Store from './models/store.model.js';
import Category from './models/category.model.js';
import Product from './models/product.model.js';
import Customer from './models/customer.model.js';
import Transaction from './models/transaction.model.js';
import Inventory from './models/inventory.model.js';
import { uploadImage } from './lib/cloudinary.js';

// Import routes
import productRoutes from './routes/product.route.js';
import inventoryRoutes from './routes/inventory.route.js';

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  
  // Production URLs
  "https://pos-inventery-rho.vercel.app",
  "https://pos-inventery.onrender.com",
  
  // React Native mobile apps
  "http://localhost:8081", // React Native Metro bundler
  "http://10.0.2.2:5001",   // Android emulator localhost
  "http://192.168.18.50:5001", // Your local network IP
  "http://192.168.1.1:5001",   // Common router IP
  "http://192.168.0.1:5001",   // Common router IP
  
  // Tauri desktop app
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  
  // Capacitor/Ionic mobile apps
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  
  // Development origins
  "http://localhost:5000",
  "http://localhost:5001",
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive
    if (NODE_ENV === 'development') {
      // Allow localhost with any port
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'x-store-id',
    'Accept',
    'Origin'
  ]
}));

// Connect to MongoDB
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log(`👤 User found: ${user ? 'YES' : 'NO'}`);

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password (simple string comparison for now)
    const isMatch = password === user.password;
    console.log(`🔍 Password check for ${email}: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
    
    if (!isMatch) {
      console.log(`❌ Password mismatch for ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get store information
    const store = await Store.findById(user.storeId);
    console.log(`🏪 Store found: ${store ? 'YES' : 'NO'}`);

    if (!store) {
      console.log(`❌ Store not found for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        storeId: user.storeId,
        permissions: user.permissions || []
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`✅ Login successful for: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.fullName || user.name,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions || []
        },
        store: {
          id: store._id,
          name: store.name,
          storeId: store.storeId
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role = 'billing_staff' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Get the demo store
    const store = await Store.findOne({ storeId: 'DEMO001' });
    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Demo store not found'
      });
    }

    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      password: password, // Store as plain text for now
      name,
      role,
      storeId: store._id,
      permissions: role === 'super_admin' ? [
        'view_dashboard', 'manage_products', 'manage_customers', 
        'process_bills', 'manage_inventory', 'view_reports', 
        'manage_users', 'manage_stores'
      ] : [
        'view_dashboard', 'process_bills'
      ]
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email, 
        role: newUser.role,
        storeId: newUser.storeId,
        permissions: newUser.permissions
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.fullName || newUser.name,
          fullName: newUser.fullName,
          role: newUser.role,
          permissions: newUser.permissions
        },
        store: {
          id: store._id,
          name: store.name,
          storeId: store.storeId
        }
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    const store = await Store.findById(decoded.storeId);

    if (!user || !store) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
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
          permissions: user.permissions || []
        },
        store: {
          id: store._id,
          name: store.name,
          storeId: store.storeId
        }
      }
    });

  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Categories API endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Customer API endpoints
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Transactions API
app.get('/api/transactions', async (req, res) => {
  try {
    console.log('Fetching transactions...');
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 });
    
    console.log(`Found ${transactions.length} transactions`);
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const transactionData = req.body;
    
    // Validate required fields
    if (!transactionData.items || transactionData.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Transaction must have at least one item' });
    }
    
    if (!transactionData.storeId) {
      return res.status(400).json({ success: false, message: 'Store ID is required' });
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
          storeId: transactionData.storeId 
        });
        
        if (inventory) {
          // Update existing inventory
          inventory.currentStock -= item.quantity;
          inventory.lastUpdated = new Date();
          
          // Add movement record
          inventory.movements.push({
            type: 'sale',
            quantity: -item.quantity,
            reason: 'POS Sale',
            reference: transaction._id,
            timestamp: new Date()
          });
          
          await inventory.save();
        } else {
          // Create new inventory record (this shouldn't happen in normal flow)
          console.warn(`No inventory record found for product ${item.product} in store ${transactionData.storeId}`);
        }
        
        // Also update product stock if it exists
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { currentStock: -item.quantity } }
        );
        
      } catch (itemError) {
        console.error(`Error updating inventory for item ${item.product}:`, itemError);
        // Continue with other items even if one fails
      }
    }
    
    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
});


// Revenue tracking API
app.get('/api/revenue', async (req, res) => {
  try {
    const { period = 'today', storeId } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    
    const query = {
      createdAt: { $gte: startDate, $lt: endDate },
      type: 'sale',
      paymentStatus: 'paid'
    };
    
    if (storeId) {
      query.storeId = storeId;
    }
    
    const transactions = await Transaction.find(query);
    
    const totalRevenue = transactions.reduce((sum, transaction) => sum + transaction.finalAmount, 0);
    const totalTransactions = transactions.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Top selling products
    const productSales = {};
    transactions.forEach(transaction => {
      transaction.items.forEach(item => {
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
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue data' });
  }
});

// Returns/Refunds API
app.post('/api/returns', async (req, res) => {
  try {
    const { transactionId, items, reason } = req.body;
    
    // Create return transaction
    const returnTransaction = new Transaction({
      ...req.body,
      type: 'return',
      billNumber: `RET-${Date.now()}`,
      status: 'completed',
      paymentMethod: 'cash',
      paymentStatus: 'refunded'
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
    console.error('Error processing return:', error);
    res.status(500).json({ success: false, message: 'Failed to process return' });
  }
});

// Image upload API
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    console.log('Image upload request received:', {
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      body: req.body
    });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const folder = req.body.folder || 'general';
    console.log('Uploading to Cloudinary with folder:', folder);

    // Upload to Cloudinary
    const result = await uploadImage(req.file.path, folder);
    console.log('Cloudinary upload successful:', result.secure_url);
    
    // Clean up local file
    try {
      fs.unlinkSync(req.file.path);
      console.log('Local file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up local file:', cleanupError);
    }
    
    res.json({ 
      success: true, 
      data: { 
        secure_url: result.secure_url,
        public_id: result.public_id 
      } 
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image: ' + error.message });
  }
});

// Update inventory product details endpoint
app.post('/api/inventory/update-product-details', async (req, res) => {
  try {
    console.log('🔄 Updating inventory records with product details...');
    
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
          reorderPoint: product.reorderPoint || 15
        };
        
        // Fix missing storeId
        if (!inventory.storeId) {
          inventory.storeId = product.storeId || '68d9b866b68fb44566d71515';
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
      updatedCount 
    });
  } catch (error) {
    console.error('❌ Error updating inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to update inventory: ' + error.message });
  }
});

// Inventory history endpoint (temporary fix)
app.get('/api/inventory/history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const inventory = await Inventory.findOne({ productId });
    
    if (!inventory) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory record not found' 
      });
    }
    
    const movements = (inventory.stockMovements || []).map(movement => ({
      ...movement.toObject(),
      productName: inventory.productDetails?.productName || 'Unknown Product',
      barcode: inventory.productDetails?.barcode || 'N/A'
    }));
    
    // Sort by timestamp (newest first)
    movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, data: movements });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stock history' });
  }
});

// ==================== DASHBOARD APIs ====================
console.log('🔧 Registering dashboard APIs...');

// Test route
app.get('/api/test-admin', (req, res) => {
  console.log('🧪 Test admin route called!');
  res.json({ success: true, message: 'Test admin route working!' });
});

console.log('✅ Test route registered');

// Admin Dashboard Statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    console.log('📊 Fetching admin stats...');
    console.log('🔍 Admin stats route called!');
    
    // Get counts from database
    const [
      totalProducts,
      totalCustomers,
      totalTransactions,
      totalRevenue,
      lowStockItems,
      outOfStockItems,
      totalUsers,
      totalCategories
    ] = await Promise.all([
      Product.countDocuments(),
      Customer.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),
      Inventory.countDocuments({ 
        $expr: { 
          $and: [
            { $gt: ['$currentStock', 0] },
            { $lte: ['$currentStock', '$reorderPoint'] }
          ]
        }
      }),
      Inventory.countDocuments({ currentStock: 0 }),
      User.countDocuments(),
      Category.countDocuments()
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    
    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todayRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: { _id: null, total: { $sum: '$finalAmount' } }
      }
    ]);

    const todayRevenueAmount = todayRevenue[0]?.total || 0;

    // Calculate average order value
    const avgOrderValue = totalTransactions > 0 ? revenue / totalTransactions : 0;

    const stats = {
      totalRevenue: revenue,
      totalTransactions,
      totalOrders: totalTransactions,
      totalCustomers,
      totalProducts,
      totalUsers,
      totalCategories,
      lowStockItems,
      outOfStockItems,
      todayRevenue: todayRevenueAmount,
      todayOrders: todayTransactions,
      averageOrderValue: avgOrderValue,
      growthRate: 12.5, // Mock growth rate
      conversionRate: 3.2 // Mock conversion rate
    };

    console.log('✅ Admin stats fetched successfully');
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
});

// Sales Analytics
app.get('/api/admin/analytics/sales', async (req, res) => {
  try {
    console.log('📈 Fetching sales analytics...');
    
    const { period = '7d' } = req.query;
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get sales data by day
    const salesData = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSales: { $sum: '$finalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$finalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Get top selling products
    const topProducts = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.sellingPrice'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Get sales by payment method
    const salesByPayment = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalSales: { $sum: '$finalAmount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const analytics = {
      salesData,
      topProducts,
      salesByPayment,
      period,
      totalSales: salesData.reduce((sum, day) => sum + day.totalSales, 0),
      totalOrders: salesData.reduce((sum, day) => sum + day.totalOrders, 0)
    };

    console.log('✅ Sales analytics fetched successfully');
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error fetching sales analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales analytics' });
  }
});

// Orders Analytics
app.get('/api/admin/analytics/orders', async (req, res) => {
  try {
    console.log('📦 Fetching orders analytics...');
    
    const { period = '7d' } = req.query;
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get orders by status
    const ordersByStatus = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$finalAmount' }
        }
      }
    ]);

    // Get orders by hour
    const ordersByHour = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          totalValue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get average order value over time
    const avgOrderValue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          avgValue: { $avg: '$finalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const analytics = {
      ordersByStatus,
      ordersByHour,
      avgOrderValue,
      period,
      totalOrders: ordersByStatus.reduce((sum, status) => sum + status.count, 0)
    };

    console.log('✅ Orders analytics fetched successfully');
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error fetching orders analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders analytics' });
  }
});

// Products Analytics
app.get('/api/admin/analytics/products', async (req, res) => {
  try {
    console.log('📦 Fetching products analytics...');
    
    // Get product performance
    const productPerformance = await Transaction.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.sellingPrice'] } },
          avgPrice: { $avg: '$items.sellingPrice' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 20 }
    ]);

    // Get products by category
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          count: 1
        }
      }
    ]);

    // Get low stock products
    const lowStockProducts = await Inventory.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ['$currentStock', 0] },
              { $lte: ['$currentStock', '$reorderPoint'] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.productName',
          currentStock: 1,
          reorderPoint: 1,
          status: 'low_stock'
        }
      }
    ]);

    // Get out of stock products
    const outOfStockProducts = await Inventory.aggregate([
      {
        $match: { currentStock: 0 }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.productName',
          currentStock: 1,
          status: 'out_of_stock'
        }
      }
    ]);

    const analytics = {
      productPerformance,
      productsByCategory,
      lowStockProducts,
      outOfStockProducts,
      totalProducts: await Product.countDocuments(),
      totalCategories: await Category.countDocuments()
    };

    console.log('✅ Products analytics fetched successfully');
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error fetching products analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products analytics' });
  }
});

// Customers Analytics
app.get('/api/admin/analytics/customers', async (req, res) => {
  try {
    console.log('👥 Fetching customers analytics...');
    
    // Get customer acquisition over time
    const customerAcquisition = await Customer.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get top customers by spending
    const topCustomers = await Transaction.aggregate([
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$finalAmount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$finalAmount' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          customerName: '$customerInfo.name',
          totalSpent: 1,
          totalOrders: 1,
          avgOrderValue: 1
        }
      }
    ]);

    // Get customer segments
    const customerSegments = await Transaction.aggregate([
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$finalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $bucket: {
          groupBy: '$totalSpent',
          boundaries: [0, 1000, 5000, 10000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgSpent: { $avg: '$totalSpent' },
            avgOrders: { $avg: '$totalOrders' }
          }
        }
      }
    ]);

    const analytics = {
      customerAcquisition,
      topCustomers,
      customerSegments,
      totalCustomers: await Customer.countDocuments(),
      newCustomersToday: await Customer.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    };

    console.log('✅ Customers analytics fetched successfully');
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('❌ Error fetching customers analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers analytics' });
  }
});

// Recent Activity
app.get('/api/admin/activity/recent', async (req, res) => {
  try {
    console.log('📋 Fetching recent activity...');
    
    const { limit = 20 } = req.query;
    
    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('billNumber finalAmount paymentStatus createdAt customer')
      .lean();

    // Get recent product additions
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('productName createdAt createdBy')
      .lean();

    // Get recent customer registrations
    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt')
      .lean();

    // Format activities
    const activities = [
      ...recentTransactions.map(tx => ({
        type: 'transaction',
        title: `New transaction #${tx.billNumber}`,
        description: `Rs.${tx.finalAmount} - ${tx.paymentStatus}`,
        timestamp: tx.createdAt,
        icon: 'receipt'
      })),
      ...recentProducts.map(product => ({
        type: 'product',
        title: 'New product added',
        description: product.productName,
        timestamp: product.createdAt,
        icon: 'package'
      })),
      ...recentCustomers.map(customer => ({
        type: 'customer',
        title: 'New customer registered',
        description: customer.name,
        timestamp: customer.createdAt,
        icon: 'user'
      }))
    ];

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('✅ Recent activity fetched successfully');
    res.json({ success: true, data: activities.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
});

// System Alerts
app.get('/api/admin/alerts', async (req, res) => {
  try {
    console.log('🚨 Fetching system alerts...');
    
    const alerts = [];

    // Check for low stock items
    const lowStockCount = await Inventory.countDocuments({
      $expr: {
        $and: [
          { $gt: ['$currentStock', 0] },
          { $lte: ['$currentStock', '$reorderPoint'] }
        ]
      }
    });

    if (lowStockCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockCount} products are running low on stock`,
        severity: 'medium',
        timestamp: new Date()
      });
    }

    // Check for out of stock items
    const outOfStockCount = await Inventory.countDocuments({ currentStock: 0 });
    if (outOfStockCount > 0) {
      alerts.push({
        type: 'error',
        title: 'Out of Stock Alert',
        message: `${outOfStockCount} products are out of stock`,
        severity: 'high',
        timestamp: new Date()
      });
    }

    // Check for recent system errors (mock)
    alerts.push({
      type: 'info',
      title: 'System Status',
      message: 'All systems running normally',
      severity: 'low',
      timestamp: new Date()
    });

    console.log('✅ System alerts fetched successfully');
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('❌ Error fetching system alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system alerts' });
  }
});

// Performance Metrics
app.get('/api/admin/performance', async (req, res) => {
  try {
    console.log('⚡ Fetching performance metrics...');
    
    const { period = '7d' } = req.query;
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get performance metrics
    const totalTransactions = await Transaction.countDocuments({
      createdAt: { $gte: startDate }
    });

    const totalRevenue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' }
        }
      }
    ]);

    const avgOrderValue = totalTransactions > 0 ? (totalRevenue[0]?.total || 0) / totalTransactions : 0;

    // Mock performance data
    const performance = {
      responseTime: Math.random() * 100 + 50, // Mock response time in ms
      uptime: 99.9, // Mock uptime percentage
      totalRequests: totalTransactions * 3, // Mock request count
      errorRate: 0.1, // Mock error rate
      avgOrderValue,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTransactions,
      period
    };

    console.log('✅ Performance metrics fetched successfully');
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('❌ Error fetching performance metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance metrics' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Starting SuperMarket POS API Server`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
  console.log(`🌐 Network API: http://192.168.18.50:${PORT}/api/test`);
  console.log(`🚀 SuperMarket POS API Server is ready!`);
});

export default app;