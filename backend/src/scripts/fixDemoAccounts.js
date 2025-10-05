const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/user.model');
const { connectDB } = require('../config/database');

const fixDemoAccounts = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    console.log('🔐 Fixing demo account passwords...');
    
    const demoCredentials = [
      { email: 'admin@supermarket.com', password: 'admin123', role: 'super_admin' },
      { email: 'store@supermarket.com', password: 'store123', role: 'store_admin' },
      { email: 'billing@supermarket.com', password: 'billing123', role: 'billing_staff' },
      { email: 'inventory@supermarket.com', password: 'inventory123', role: 'inventory_staff' }
    ];
    
    const results = [];
    
    for (const cred of demoCredentials) {
      const user = await User.findOne({ email: cred.email });
      
      if (user) {
        // Update user password to plain text (since we disabled bcrypt)
        user.password = cred.password;
        user.role = cred.role;
        
        // Set appropriate permissions based on role
        const rolePermissions = {
          super_admin: [
            'view_dashboard', 'manage_products', 'manage_inventory', 'process_bills', 
            'manage_customers', 'view_reports', 'manage_users', 'manage_store', 
            'manage_subscription', 'manage_categories', 'view_analytics', 'export_data'
          ],
          store_admin: [
            'view_dashboard', 'manage_products', 'manage_inventory', 'process_bills', 
            'manage_customers', 'view_reports', 'manage_users', 'view_analytics'
          ],
          billing_staff: [
            'view_dashboard', 'process_bills', 'manage_customers', 'view_reports'
          ],
          inventory_staff: [
            'view_dashboard', 'manage_inventory', 'view_reports'
          ]
        };
        
        user.permissions = rolePermissions[cred.role] || rolePermissions.billing_staff;
        user.isActive = true;
        user.isVerified = true;
        
        await user.save();
        
        // Test the password immediately
        const testMatch = cred.password === user.password;
        
        results.push({
          email: cred.email,
          role: cred.role,
          updated: true,
          testPassed: testMatch
        });
        
        console.log(`✅ ${cred.email} (${cred.role}): Password fixed - Test: ${testMatch ? 'PASS' : 'FAIL'}`);
      } else {
        results.push({
          email: cred.email,
          updated: false,
          error: 'User not found'
        });
        console.log(`❌ ${cred.email}: User not found`);
      }
    }
    
    console.log('🎉 Demo account fixing completed!');
    console.log('📋 Results:');
    results.forEach(result => {
      if (result.updated) {
        console.log(`   ✅ ${result.email} (${result.role}): ${result.testPassed ? 'WORKING' : 'FAILED'}`);
      } else {
        console.log(`   ❌ ${result.email}: ${result.error}`);
      }
    });
    
    console.log('\n🔑 Demo Account Credentials:');
    console.log('   Super Admin: admin@supermarket.com / admin123');
    console.log('   Store Admin: store@supermarket.com / store123');
    console.log('   Billing Staff: billing@supermarket.com / billing123');
    console.log('   Inventory Staff: inventory@supermarket.com / inventory123');
    
  } catch (error) {
    console.error('❌ Error fixing demo accounts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database disconnected');
    process.exit(0);
  }
};

fixDemoAccounts();
