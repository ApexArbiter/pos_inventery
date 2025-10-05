const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/user.model');
const Store = require('../models/store.model');
const Category = require('../models/category.model');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supermarket_pos_dev');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Demo Accounts Configuration
const DEMO_ACCOUNTS = {
  store: {
    storeId: 'DEMO001',
    storeName: 'Demo SuperMarket',
    address: {
      street: '123 Main Street',
      city: 'Demo City', 
      state: 'Demo State',
      pincode: '123456',
      country: 'Pakistan'
    },
    contact: {
      phone: '+91-9876543210',
      email: 'demo@supermarket.com',
    },
    business: {
      gstNumber: 'GST123456789',
      businessType: 'supermarket'
    }
  },
  users: [
    {
      fullName: 'Super Admin',
      email: 'admin@supermarket.com',
      password: 'admin123',
      role: 'super_admin',
      permissions: [
        'view_dashboard', 'manage_products', 'manage_inventory', 'process_bills', 
        'manage_customers', 'view_reports', 'manage_users', 'manage_store', 
        'manage_subscription', 'manage_categories', 'view_analytics', 'export_data'
      ]
    },
    {
      fullName: 'Store Admin',
      email: 'store@supermarket.com', 
      password: 'store123',
      role: 'store_admin',
      permissions: [
        'view_dashboard', 'manage_products', 'manage_inventory', 'process_bills', 
        'manage_customers', 'view_reports', 'manage_users', 'view_analytics'
      ]
    },
    {
      fullName: 'Billing Staff',
      email: 'billing@supermarket.com',
      password: 'billing123', 
      role: 'billing_staff',
      permissions: [
        'view_dashboard', 'process_bills', 'manage_customers', 'view_reports'
      ]
    },
    {
      fullName: 'Inventory Staff',
      email: 'inventory@supermarket.com',
      password: 'inventory123',
      role: 'inventory_staff', 
      permissions: [
        'view_dashboard', 'manage_inventory', 'manage_products', 'view_reports'
      ]
    }
  ],
  categories: [
    { name: 'Groceries', description: 'Daily grocery items' },
    { name: 'Electronics', description: 'Electronic gadgets and appliances' },
    { name: 'Clothing', description: 'Apparel and accessories' },
    { name: 'Health & Beauty', description: 'Health and beauty products' }
  ]
};

// Create demo accounts
const createDemoAccounts = async () => {
  try {
    console.log('🎯 Creating demo accounts...');

    // Step 1: Create demo store with placeholder createdBy
    let store = await Store.findOne({ storeId: DEMO_ACCOUNTS.store.storeId });
    if (!store) {
      const placeholderUserId = new mongoose.Types.ObjectId();
      
      store = new Store({
        ...DEMO_ACCOUNTS.store,
        subscription: {
          planType: 'basic',
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          isActive: true
        },
        isActive: true,
        createdBy: placeholderUserId
      });
      
      await store.save();
      console.log('✅ Demo store created');
    } else {
      console.log('🏪 Demo store already exists');
    }

    // Step 2: Create users
    let firstAdminUser = null;
    const createdUsers = [];

    for (const userData of DEMO_ACCOUNTS.users) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        // Hash password with consistent salt rounds
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        console.log(`🔐 Creating user ${userData.email} with password: ${userData.password}`);
        console.log(`🔐 Hashed password: ${hashedPassword.substring(0, 20)}...`);
        
        const newUser = new User({
          fullName: userData.fullName,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          permissions: userData.permissions,
          storeId: store._id,
          branch: 'Main Branch',
          isActive: true,
          isVerified: true
        });
        
        await newUser.save();
        
        if (userData.role === 'super_admin' && !firstAdminUser) {
          firstAdminUser = newUser;
        }
        
        createdUsers.push({
          email: userData.email,
          password: userData.password, // Store plain password for reference
          role: userData.role
        });
        
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
        
        // Test password immediately after creation
        const testMatch = await bcrypt.compare(userData.password, hashedPassword);
        console.log(`🧪 Password test for ${userData.email}: ${testMatch ? 'PASS' : 'FAIL'}`);
        
      } else {
        console.log(`👤 User already exists: ${userData.email}`);
        if (userData.role === 'super_admin' && !firstAdminUser) {
          firstAdminUser = existingUser;
        }
      }
    }

    // Step 3: Update store createdBy reference
    if (firstAdminUser) {
      store.createdBy = firstAdminUser._id;
      await store.save();
      console.log('✅ Updated store createdBy reference');

      // Step 4: Create categories
      for (const catData of DEMO_ACCOUNTS.categories) {
        const existing = await Category.findOne({ 
          name: catData.name, 
          storeId: store._id 
        });
        
        if (!existing) {
          const category = new Category({
            ...catData,
            storeId: store._id,
            createdBy: firstAdminUser._id,
            isActive: true
          });
          
          await category.save();
          console.log(`✅ Created category: ${catData.name}`);
        }
      }
    }

    console.log('\n🎉 Demo accounts created successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('═'.repeat(50));
    
    createdUsers.forEach(user => {
      console.log(`${user.role.toUpperCase().padEnd(15)} | ${user.email.padEnd(25)} | ${user.password}`);
    });
    
    console.log('═'.repeat(50));
    
    return {
      success: true,
      store: {
        name: store.storeName,
        id: store._id,
        storeId: store.storeId
      },
      accounts: createdUsers
    };

  } catch (error) {
    console.error('❌ Error creating demo accounts:', error);
    throw error;
  }
};

// Test login function
const testLogin = async (email, password) => {
  try {
    console.log(`\n🧪 Testing login for: ${email}`);
    
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('❌ User not found');
      return false;
    }
    
    console.log(`👤 User found: ${user.fullName}`);
    console.log(`🔐 Stored hash: ${user.password.substring(0, 20)}...`);
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`🔍 Password match: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    return isMatch;
    
  } catch (error) {
    console.error('❌ Login test error:', error);
    return false;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    const result = await createDemoAccounts();
    
    // Test each account
    console.log('\n🧪 TESTING ALL ACCOUNTS:');
    console.log('═'.repeat(50));
    
    for (const account of result.accounts) {
      await testLogin(account.email, account.password);
    }
    
    console.log('\n✅ Demo setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database disconnected');
    process.exit(0);
  }
};

// Export for use in other files
module.exports = {
  DEMO_ACCOUNTS,
  createDemoAccounts,
  testLogin
};

// Run if this file is executed directly
if (require.main === module) {
  main();
}
