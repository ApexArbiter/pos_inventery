import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/product.model.js';
import Inventory from '../models/inventory.model.js';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://mahadrasool:Mahad123@cluster0.itw0k.mongodb.net/supermarket_pos_dev?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixInventoryRecords = async () => {
  try {
    console.log('🔧 Fixing inventory records...');
    
    const inventories = await Inventory.find({});
    console.log(`Found ${inventories.length} inventory records`);
    
    for (const inventory of inventories) {
      console.log(`\n📦 Processing inventory for product: ${inventory.productId}`);
      
      // Get product details
      const product = await Product.findById(inventory.productId);
      
      if (!product) {
        console.log(`❌ Product not found for inventory ${inventory._id}`);
        continue;
      }
      
      // Update inventory with missing fields
      const updateData = {
        storeId: product.storeId || '68d9b866b68fb44566d71515',
        productDetails: {
          productName: product.productName || product.name,
          costPrice: product.costPrice || 0,
          sellingPrice: product.sellingPrice || product.price || 0,
          barcode: product.barcode,
          unit: product.unit,
          category: product.category,
          brand: product.brand
        }
      };
      
      // Initialize stockMovements if it doesn't exist
      if (!inventory.stockMovements) {
        updateData.stockMovements = [];
      }
      
      // Update availableStock
      updateData.availableStock = Math.max(0, inventory.currentStock || 0);
      
      await Inventory.findByIdAndUpdate(inventory._id, updateData);
      console.log(`✅ Fixed inventory for product: ${product.productName || product.name}`);
    }
    
    console.log('\n🎉 All inventory records fixed!');
  } catch (error) {
    console.error('❌ Error fixing inventory records:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixInventoryRecords();
  process.exit(0);
};

main();
