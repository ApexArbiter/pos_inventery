const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/user.model');
const Store = require('../models/store.model');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const Subscription = require('../models/subscription.model');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supermarket_pos_dev', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Create demo store
const createDemoStore = async () => {
  try {
    const existingStore = await Store.findOne({ storeName: 'Demo SuperMarket' });
    if (existingStore) {
      console.log('📦 Demo store already exists');
      return existingStore;
    }

    const store = new Store({
      storeId: 'STORE001',
      storeName: 'Demo SuperMarket',
      address: {
        street: '123 Main Street',
        city: 'Demo City',
        state: 'Demo State',
        pincode: '123456',
        country: 'India'
      },
      phone: '+91-9876543210',
      email: 'demo@supermarket.com',
      gstNumber: 'GST123456789',
      licenseNumber: 'LIC001',
      subscriptionExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
      isActive: true,
      branding: {
        logo: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        billTemplate: 'modern'
      }
    });

    await store.save();
    console.log('✅ Demo store created successfully');
    return store;
  } catch (error) {
    console.error('❌ Error creating demo store:', error);
    throw error;
  }
};

// Create demo users
const createDemoUsers = async (storeId) => {
  try {
    const users = [
      {
        fullName: 'Super Admin',
        email: 'admin@supermarket.com',
        password: 'admin123',
        phone: '+91-9876543210',
        role: 'super_admin',
        permissions: [
          'view_dashboard', 'manage_products', 'manage_inventory', 'process_bills', 
          'manage_customers', 'view_reports', 'manage_users', 'manage_store', 
          'manage_subscription', 'manage_categories', 'manage_suppliers', 
          'view_analytics', 'export_data', 'manage_settings'
        ],
        storeId: storeId,
        branch: 'Main Branch',
        isActive: true,
        isVerified: true
      },
      {
        fullName: 'Store Admin',
        email: 'store@supermarket.com',
        password: 'store123',
        phone: '+91-9876543211',
        role: 'store_admin',
        permissions: [
          'view_dashboard', 'manage_products', 'manage_inventory', 'process_bills', 
          'manage_customers', 'view_reports', 'manage_users', 'manage_categories', 
          'view_analytics', 'export_data'
        ],
        storeId: storeId,
        branch: 'Main Branch',
        isActive: true,
        isVerified: true
      },
      {
        fullName: 'Billing Staff',
        email: 'billing@supermarket.com',
        password: 'billing123',
        phone: '+91-9876543212',
        role: 'billing_staff',
        permissions: [
          'view_dashboard', 'process_bills', 'manage_customers', 'view_reports'
        ],
        storeId: storeId,
        branch: 'Main Branch',
        isActive: true,
        isVerified: true
      },
      {
        fullName: 'Inventory Staff',
        email: 'inventory@supermarket.com',
        password: 'inventory123',
        phone: '+91-9876543213',
        role: 'inventory_staff',
        permissions: [
          'view_dashboard', 'manage_inventory', 'manage_products', 'view_reports'
        ],
        storeId: storeId,
        branch: 'Main Branch',
        isActive: true,
        isVerified: true
      }
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`👤 User ${userData.email} already exists`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);

      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    }
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    throw error;
  }
};

// Create demo categories
const createDemoCategories = async (storeId, createdBy) => {
  try {
    const categories = [
      { name: 'Groceries', description: 'Daily grocery items' },
      { name: 'Beverages', description: 'Drinks and beverages' },
      { name: 'Snacks', description: 'Snacks and confectionery' },
      { name: 'Personal Care', description: 'Personal hygiene products' },
      { name: 'Household', description: 'Household cleaning items' },
      { name: 'Electronics', description: 'Small electronic items' }
    ];

    const createdCategories = [];

    for (const categoryData of categories) {
      const existingCategory = await Category.findOne({ 
        name: categoryData.name, 
        storeId: storeId 
      });

      if (existingCategory) {
        console.log(`📂 Category ${categoryData.name} already exists`);
        createdCategories.push(existingCategory);
        continue;
      }

      const category = new Category({
        ...categoryData,
        storeId: storeId,
        isActive: true,
        createdBy: createdBy
      });

      await category.save();
      createdCategories.push(category);
      console.log(`✅ Created category: ${categoryData.name}`);
    }

    return createdCategories;
  } catch (error) {
    console.error('❌ Error creating demo categories:', error);
    throw error;
  }
};

// Create demo products
const createDemoProducts = async (storeId, categories, createdBy) => {
  try {
    const products = [
      {
        productName: 'Basmati Rice 1kg',
        category: categories.find(c => c.name === 'Groceries')?._id,
        brand: 'India Gate',
        mrp: 180,
        sellingPrice: 175,
        costPrice: 160,
        gstRate: 5,
        hsnCode: '1006',
        unit: 'kg',
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderPoint: 30,
        description: 'Premium quality basmati rice'
      },
      {
        productName: 'Coca Cola 500ml',
        category: categories.find(c => c.name === 'Beverages')?._id,
        brand: 'Coca Cola',
        mrp: 40,
        sellingPrice: 35,
        costPrice: 25,
        gstRate: 12,
        hsnCode: '2202',
        unit: 'pcs',
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 100,
        description: 'Refreshing cola drink'
      },
      {
        productName: 'Lays Chips 50g',
        category: categories.find(c => c.name === 'Snacks')?._id,
        brand: 'Lays',
        mrp: 20,
        sellingPrice: 18,
        costPrice: 12,
        gstRate: 12,
        hsnCode: '2005',
        unit: 'pcs',
        minStockLevel: 100,
        maxStockLevel: 1000,
        reorderPoint: 200,
        description: 'Crispy potato chips'
      },
      {
        productName: 'Colgate Toothpaste 100g',
        category: categories.find(c => c.name === 'Personal Care')?._id,
        brand: 'Colgate',
        mrp: 85,
        sellingPrice: 80,
        costPrice: 65,
        gstRate: 18,
        hsnCode: '3306',
        unit: 'pcs',
        minStockLevel: 30,
        maxStockLevel: 300,
        reorderPoint: 50,
        description: 'Fluoride toothpaste'
      },
      {
        productName: 'Surf Excel 1kg',
        category: categories.find(c => c.name === 'Household')?._id,
        brand: 'Surf Excel',
        mrp: 320,
        sellingPrice: 310,
        costPrice: 280,
        gstRate: 18,
        hsnCode: '3402',
        unit: 'kg',
        minStockLevel: 15,
        maxStockLevel: 150,
        reorderPoint: 25,
        description: 'Detergent powder'
      }
    ];

    for (const productData of products) {
      const existingProduct = await Product.findOne({ 
        productName: productData.productName, 
        storeId: storeId 
      });

      if (existingProduct) {
        console.log(`📦 Product ${productData.productName} already exists`);
        continue;
      }

      const product = new Product({
        ...productData,
        storeId: storeId,
        isActive: true,
        createdBy: createdBy,
        images: []
      });

      await product.save();
      console.log(`✅ Created product: ${productData.productName}`);
    }
  } catch (error) {
    console.error('❌ Error creating demo products:', error);
    throw error;
  }
};

// Create demo customers
const createDemoCustomers = async (storeId) => {
  try {
    const customers = [
      {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+91-9876543220',
        address: {
          street: '456 Oak Street',
          city: 'Demo City',
          state: 'Demo State',
          pincode: '123456'
        },
        loyaltyPoints: 150,
        totalPurchases: 2500,
        lastPurchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        notes: 'Regular customer'
      },
      {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+91-9876543221',
        address: {
          street: '789 Pine Street',
          city: 'Demo City',
          state: 'Demo State',
          pincode: '123456'
        },
        loyaltyPoints: 300,
        totalPurchases: 5000,
        lastPurchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        notes: 'VIP customer'
      }
    ];

    for (const customerData of customers) {
      const existingCustomer = await Customer.findOne({ 
        email: customerData.email, 
        storeId: storeId 
      });

      if (existingCustomer) {
        console.log(`👥 Customer ${customerData.email} already exists`);
        continue;
      }

      const customer = new Customer({
        ...customerData,
        storeId: storeId,
        isActive: true
      });

      await customer.save();
      console.log(`✅ Created customer: ${customerData.fullName}`);
    }
  } catch (error) {
    console.error('❌ Error creating demo customers:', error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Create demo store
    const store = await createDemoStore();
    
    // Create demo users
    await createDemoUsers(store._id);
    
    // Get admin user for creating other entities
    const adminUser = await User.findOne({ email: 'admin@supermarket.com' });
    
    // Create demo categories
    const categories = await createDemoCategories(store._id, adminUser._id);
    
    // Create demo products
    await createDemoProducts(store._id, categories, adminUser._id);
    
    // Create demo customers
    await createDemoCustomers(store._id);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Accounts Created:');
    console.log('👑 Super Admin: admin@supermarket.com / admin123');
    console.log('🏪 Store Admin: store@supermarket.com / store123');
    console.log('💳 Billing Staff: billing@supermarket.com / billing123');
    console.log('📦 Inventory Staff: inventory@supermarket.com / inventory123');
    console.log('\n🚀 You can now login with any of these accounts!');
    
  } catch (error) {
    console.error('💥 Database seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
