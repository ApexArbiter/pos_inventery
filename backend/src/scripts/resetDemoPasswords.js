const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/user.model');
const { connectDB } = require('../config/database');

// Demo credentials
const DEMO_CREDENTIALS = [
  { email: 'admin@supermarket.com', password: 'admin123', role: 'super_admin' },
  { email: 'store@supermarket.com', password: 'store123', role: 'store_admin' },
  { email: 'billing@supermarket.com', password: 'billing123', role: 'billing_staff' },
  { email: 'inventory@supermarket.com', password: 'inventory123', role: 'inventory_staff' }
];

const resetPasswords = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    console.log('🔐 Resetting demo account passwords...');
    
    for (const cred of DEMO_CREDENTIALS) {
      const user = await User.findOne({ email: cred.email });
      
      if (user) {
        // Hash password with consistent method
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(cred.password, salt);
        
        // Update user password
        user.password = hashedPassword;
        await user.save();
        
        // Test the password immediately
        const testMatch = await bcrypt.compare(cred.password, hashedPassword);
        
        console.log(`✅ ${cred.email}: Password updated - Test: ${testMatch ? 'PASS' : 'FAIL'}`);
        
        if (!testMatch) {
          console.error(`❌ Password verification failed for ${cred.email}`);
        }
      } else {
        console.log(`❌ User not found: ${cred.email}`);
      }
    }
    
    console.log('\n🎉 Demo passwords reset complete!');
    console.log('\n📋 DEMO LOGIN CREDENTIALS:');
    console.log('═'.repeat(60));
    DEMO_CREDENTIALS.forEach(cred => {
      console.log(`${cred.role.toUpperCase().padEnd(15)} | ${cred.email.padEnd(30)} | ${cred.password}`);
    });
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database disconnected');
    process.exit(0);
  }
};

module.exports = { resetPasswords, DEMO_CREDENTIALS };

// Run if executed directly
if (require.main === module) {
  resetPasswords();
}
