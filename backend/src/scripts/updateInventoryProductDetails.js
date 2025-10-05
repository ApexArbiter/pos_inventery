import mongoose from 'mongoose';
import Inventory from '../models/inventory.model.js';
import Product from '../models/product.model.js';

const updateInventoryProductDetails = async () => {
  try {
    console.log('🔄 Updating inventory records with product details...');
    
    // Get all inventory records
    const inventoryRecords = await Inventory.find({});
    console.log(`Found ${inventoryRecords.length} inventory records`);
    
    for (const inventory of inventoryRecords) {
      // Get the product details
      const product = await Product.findById(inventory.productId);
      
      if (product) {
        // Update the inventory record with product details
        inventory.productDetails = {
          productName: product.productName,
          barcode: product.barcode,
          description: product.description,
          category: product.category,
          mrp: product.mrp,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          unit: product.unit,
          images: product.images || [],
          isActive: product.isActive,
          isReturnable: product.isReturnable,
          minStockLevel: product.minStockLevel || 10,
          maxStockLevel: product.maxStockLevel || 100,
          reorderPoint: product.reorderPoint || 15
        };
        
        await inventory.save();
        console.log(`✅ Updated inventory for product: ${product.productName}`);
      } else {
        console.log(`❌ Product not found for inventory ID: ${inventory._id}`);
      }
    }
    
    console.log('🎉 Inventory update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating inventory:', error);
    process.exit(1);
  }
};

// Connect to MongoDB and run the update
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mahadrasool:123456789@cluster0.itw0k.mongodb.net/supermarket_pos_dev?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('📦 Connected to MongoDB');
    updateInventoryProductDetails();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });
