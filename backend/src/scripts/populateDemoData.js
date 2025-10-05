const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/user.model');
const Store = require('../models/store.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Customer = require('../models/customer.model');
const Transaction = require('../models/transaction.model');
const Inventory = require('../models/inventory.model');
const { connectDB } = require('../config/database');

const populateDemoData = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    console.log('🗑️ Clearing existing demo data...');
    
    // Clear existing data (except users and stores)
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Customer.deleteMany({});
    await Transaction.deleteMany({});
    await Inventory.deleteMany({});
    
    console.log('📦 Creating demo categories...');
    
    // Create categories
    const categories = [
      { name: 'Electronics', description: 'Electronic devices and gadgets' },
      { name: 'Clothing', description: 'Fashion and apparel' },
      { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
      { name: 'Books', description: 'Books and educational materials' },
      { name: 'Sports', description: 'Sports equipment and accessories' },
      { name: 'Beauty', description: 'Beauty and personal care products' }
    ];
    
    const createdCategories = [];
    for (const cat of categories) {
      const category = new Category({
        ...cat,
        storeId: '68d9b866b68fb44566d71515', // Demo store ID
        isActive: true,
        createdBy: '68d9b88797f4b497a5f255b8' // Demo admin user ID
      });
      await category.save();
      createdCategories.push(category);
      console.log(`✅ Created category: ${cat.name}`);
    }
    
    console.log('📱 Creating demo products...');
    
    // Create products
    const products = [
      {
        productName: 'Apple iPhone 15',
        barcode: '1234567890123',
        category: createdCategories[0]._id, // Electronics category
        description: 'Latest iPhone with advanced features',
        mrp: 79999,
        sellingPrice: 74999,
        costPrice: 65000,
        gstRate: 18,
        hsnCode: '8517',
        unit: 'pcs',
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 15,
        isActive: true,
        storeId: '68d9b866b68fb44566d71515',
        createdBy: '68d9b88797f4b497a5f255b8',
        images: [{ url: 'https://via.placeholder.com/300x300?text=iPhone+15', alt: 'iPhone 15' }],
        supplier: { name: 'Apple Inc.', contact: '+1-800-APL-CARE' }
      },
      {
        productName: 'Samsung Galaxy S24',
        barcode: '1234567890124',
        category: createdCategories[0]._id, // Electronics category
        description: 'Latest Samsung flagship smartphone',
        mrp: 89999,
        sellingPrice: 84999,
        costPrice: 75000,
        gstRate: 18,
        hsnCode: '8517',
        unit: 'pcs',
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 15,
        isActive: true,
        storeId: '68d9b866b68fb44566d71515',
        createdBy: '68d9b88797f4b497a5f255b8',
        images: [{ url: 'https://via.placeholder.com/300x300?text=Galaxy+S24', alt: 'Galaxy S24' }],
        supplier: { name: 'Samsung Electronics', contact: '+1-800-SAMSUNG' }
      },
      {
        productName: 'MacBook Pro 14"',
        barcode: '1234567890125',
        category: createdCategories[0]._id, // Electronics category
        description: 'Professional laptop for developers',
        mrp: 199999,
        sellingPrice: 189999,
        costPrice: 170000,
        gstRate: 18,
        hsnCode: '8471',
        unit: 'pcs',
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 8,
        isActive: true,
        storeId: '68d9b866b68fb44566d71515',
        createdBy: '68d9b88797f4b497a5f255b8',
        images: [{ url: 'https://via.placeholder.com/300x300?text=MacBook+Pro', alt: 'MacBook Pro' }],
        supplier: { name: 'Apple Inc.', contact: '+1-800-APL-CARE' }
      },
      {
        productName: 'Nike Air Max 270',
        barcode: '1234567890126',
        category: createdCategories[1]._id, // Clothing category
        description: 'Comfortable running shoes',
        mrp: 12999,
        sellingPrice: 11999,
        costPrice: 8000,
        gstRate: 12,
        hsnCode: '6404',
        unit: 'pair',
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderPoint: 30,
        isActive: true,
        storeId: '68d9b866b68fb44566d71515',
        createdBy: '68d9b88797f4b497a5f255b8',
        images: [{ url: 'https://via.placeholder.com/300x300?text=Nike+Air+Max', alt: 'Nike Air Max' }],
        supplier: { name: 'Nike Inc.', contact: '+1-800-NIKE-USA' }
      },
      {
        productName: 'Coffee Maker Deluxe',
        barcode: '1234567890127',
        category: createdCategories[2]._id, // Home & Garden category
        description: 'Premium coffee maker for home use',
        mrp: 8999,
        sellingPrice: 7999,
        costPrice: 5000,
        gstRate: 12,
        hsnCode: '8516',
        unit: 'pcs',
        minStockLevel: 15,
        maxStockLevel: 100,
        reorderPoint: 20,
        isActive: true,
        storeId: '68d9b866b68fb44566d71515',
        createdBy: '68d9b88797f4b497a5f255b8',
        images: [{ url: 'https://via.placeholder.com/300x300?text=Coffee+Maker', alt: 'Coffee Maker' }],
        supplier: { name: 'KitchenAid', contact: '+1-800-541-6390' }
      },
      {
        productName: 'JavaScript: The Good Parts',
        barcode: '1234567890128',
        category: createdCategories[3]._id, // Books category
        description: 'Essential JavaScript programming book',
        mrp: 1999,
        sellingPrice: 1799,
        costPrice: 1000,
        gstRate: 5,
        hsnCode: '4901',
        unit: 'pcs',
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 75,
        isActive: true,
        storeId: '68d9b866b68fb44566d71515',
        createdBy: '68d9b88797f4b497a5f255b8',
        images: [{ url: 'https://via.placeholder.com/300x300?text=JS+Book', alt: 'JavaScript Book' }],
        supplier: { name: 'O\'Reilly Media', contact: '+1-800-998-9938' }
      }
    ];
    
    const createdProducts = [];
    for (const prod of products) {
      const product = new Product(prod);
      await product.save();
      createdProducts.push(product);
      console.log(`✅ Created product: ${prod.productName}`);
    }
    
    console.log('👥 Creating demo customers...');
    
    // Create customers
    const customers = [
      {
        customerId: 'CUST001',
        storeId: '68d9b866b68fb44566d71515',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-0123',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '10001',
          country: 'USA'
        },
        loyaltyPoints: 150,
        totalPurchases: 2500,
        lastPurchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
        isActive: true,
        createdBy: '68d9b88797f4b497a5f255b8'
      },
      {
        customerId: 'CUST002',
        storeId: '68d9b866b68fb44566d71515',
        name: 'Jane Doe',
        email: 'jane.doe@email.com',
        phone: '+1-555-0124',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          pincode: '90210',
          country: 'USA'
        },
        loyaltyPoints: 300,
        totalPurchases: 4500,
        lastPurchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
        isActive: true,
        createdBy: '68d9b88797f4b497a5f255b8'
      },
      {
        customerId: 'CUST003',
        storeId: '68d9b866b68fb44566d71515',
        name: 'Mike Johnson',
        email: 'mike.johnson@email.com',
        phone: '+1-555-0125',
        address: {
          street: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          pincode: '60601',
          country: 'USA'
        },
        loyaltyPoints: 75,
        totalPurchases: 1200,
        lastPurchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 48),
        isActive: true,
        createdBy: '68d9b88797f4b497a5f255b8'
      }
    ];
    
    const createdCustomers = [];
    for (const cust of customers) {
      const customer = new Customer(cust);
      await customer.save();
      createdCustomers.push(customer);
      console.log(`✅ Created customer: ${cust.fullName}`);
    }
    
    console.log('📦 Creating inventory records...');
    
    // Create inventory records
    for (const product of createdProducts) {
      const inventory = new Inventory({
        productId: product._id,
        storeId: '68d9b866b68fb44566d71515',
        currentStock: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
        reservedStock: 0,
        availableStock: 0, // Will be calculated
        lastRestocked: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7), // Random date within last week
        reorderPoint: product.reorderPoint,
        stockMovements: [
          {
            type: 'in',
            quantity: Math.floor(Math.random() * 100) + 50,
            reason: 'Initial stock',
            referenceId: 'INIT001',
            performedBy: '68d9b88797f4b497a5f255b8',
            timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30)
          }
        ]
      });
      
      // Calculate available stock
      inventory.availableStock = inventory.currentStock - inventory.reservedStock;
      
      await inventory.save();
      console.log(`✅ Created inventory for: ${product.productName} (Stock: ${inventory.currentStock})`);
    }
    
    console.log('🧾 Creating demo transactions...');
    
    // Create demo transactions
    const transactions = [
      {
        billNumber: 'BILL-001',
        storeId: '68d9b866b68fb44566d71515',
        customerId: createdCustomers[0]._id,
        customerInfo: {
          name: createdCustomers[0].name,
          email: createdCustomers[0].email,
          phone: createdCustomers[0].phone
        },
        items: [
          {
            productId: createdProducts[0]._id,
            productName: createdProducts[0].productName,
            barcode: createdProducts[0].barcode,
            category: createdProducts[0].category,
            mrp: createdProducts[0].mrp,
            sellingPrice: createdProducts[0].sellingPrice,
            unit: createdProducts[0].unit,
            quantity: 1,
            unitPrice: createdProducts[0].sellingPrice,
            totalPrice: createdProducts[0].sellingPrice,
            totalAmount: createdProducts[0].sellingPrice,
            gstRate: createdProducts[0].gstRate
          }
        ],
        subtotal: createdProducts[0].sellingPrice,
        totalDiscount: 0,
        gstAmount: createdProducts[0].sellingPrice * (createdProducts[0].gstRate / 100),
        finalAmount: createdProducts[0].sellingPrice * (1 + createdProducts[0].gstRate / 100),
        paymentMethod: 'card',
        paymentStatus: 'completed',
        billGeneratedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        whatsappSent: true,
        cashierId: '68d9b88797f4b497a5f255b8',
        cashierName: 'Admin User'
      },
      {
        billNumber: 'BILL-002',
        storeId: '68d9b866b68fb44566d71515',
        customerId: createdCustomers[1]._id,
        customerInfo: {
          name: createdCustomers[1].name,
          email: createdCustomers[1].email,
          phone: createdCustomers[1].phone
        },
        items: [
          {
            productId: createdProducts[1]._id,
            productName: createdProducts[1].productName,
            barcode: createdProducts[1].barcode,
            category: createdProducts[1].category,
            mrp: createdProducts[1].mrp,
            sellingPrice: createdProducts[1].sellingPrice,
            unit: createdProducts[1].unit,
            quantity: 1,
            unitPrice: createdProducts[1].sellingPrice,
            totalPrice: createdProducts[1].sellingPrice,
            totalAmount: createdProducts[1].sellingPrice,
            gstRate: createdProducts[1].gstRate
          },
          {
            productId: createdProducts[3]._id,
            productName: createdProducts[3].productName,
            barcode: createdProducts[3].barcode,
            category: createdProducts[3].category,
            mrp: createdProducts[3].mrp,
            sellingPrice: createdProducts[3].sellingPrice,
            unit: createdProducts[3].unit,
            quantity: 2,
            unitPrice: createdProducts[3].sellingPrice,
            totalPrice: createdProducts[3].sellingPrice * 2,
            totalAmount: createdProducts[3].sellingPrice * 2,
            gstRate: createdProducts[3].gstRate
          }
        ],
        subtotal: createdProducts[1].sellingPrice + (createdProducts[3].sellingPrice * 2),
        totalDiscount: 1000,
        gstAmount: (createdProducts[1].sellingPrice + (createdProducts[3].sellingPrice * 2) - 1000) * 0.15, // Average GST
        finalAmount: (createdProducts[1].sellingPrice + (createdProducts[3].sellingPrice * 2) - 1000) * 1.15,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        billGeneratedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        whatsappSent: false,
        cashierId: '68d9b88797f4b497a5f255b8',
        cashierName: 'Admin User'
      }
    ];
    
    for (const trans of transactions) {
      const transaction = new Transaction(trans);
      await transaction.save();
      console.log(`✅ Created transaction: ${trans.billNumber}`);
    }
    
    console.log('🎉 Demo data population completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${createdCategories.length}`);
    console.log(`   - Products: ${createdProducts.length}`);
    console.log(`   - Customers: ${createdCustomers.length}`);
    console.log(`   - Transactions: ${transactions.length}`);
    console.log(`   - Inventory records: ${createdProducts.length}`);
    
  } catch (error) {
    console.error('❌ Error populating demo data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database disconnected');
    process.exit(0);
  }
};

populateDemoData();
