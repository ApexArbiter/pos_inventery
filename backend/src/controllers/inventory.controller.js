import Inventory from '../models/inventory.model.js';
import Product from '../models/product.model.js';

// Get all inventory levels
export const getInventoryLevels = async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .sort({ currentStock: 1 });
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching inventory levels:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory levels' });
  }
};

// Get inventory value
export const getInventoryValue = async (req, res) => {
  try {
    const inventory = await Inventory.find();
    
    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.currentStock * (item.productDetails?.costPrice || 0));
    }, 0);
    
    res.json({ 
      success: true, 
      data: { 
        totalValue,
        itemCount: inventory.length,
        lowStockItems: inventory.filter(item => item.currentStock <= (item.productDetails?.reorderPoint || 10)).length
      } 
    });
  } catch (error) {
    console.error('Error fetching inventory value:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory value' });
  }
};

// Get low stock items
export const getLowStockItems = async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .sort({ currentStock: 1 });
    
    const lowStockItems = inventory.filter(item => 
      item.currentStock <= (item.productDetails?.reorderPoint || 10)
    );
    
    res.json({ success: true, data: lowStockItems });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock items' });
  }
};

// Get out of stock items
export const getOutOfStockItems = async (req, res) => {
  try {
    const inventory = await Inventory.find({ currentStock: 0 });
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching out of stock items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch out of stock items' });
  }
};

// Get inventory movements
export const getInventoryMovements = async (req, res) => {
  try {
    const { productId, limit = 50 } = req.query;
    
    let query = {};
    if (productId) {
      query.productId = productId;
    }
    
    const inventory = await Inventory.find(query)
      .sort({ lastUpdated: -1 })
      .limit(parseInt(limit));
    
    const movements = inventory.flatMap(item => {
      // Ensure stockMovements array exists
      const itemMovements = item.stockMovements || [];
      return itemMovements.map(movement => ({
        ...movement.toObject(),
        productName: item.productDetails?.productName,
        productId: item.productId
      }));
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, data: movements });
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory movements' });
  }
};

// Get inventory by product
export const getInventoryByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const inventory = await Inventory.findOne({ productId: productId });
    
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Inventory not found for this product' });
    }
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching inventory by product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory by product' });
  }
};

// Adjust inventory
export const adjustInventory = async (req, res) => {
  try {
    const { productId, adjustment, reason, reference } = req.body;
    
    let inventory = await Inventory.findOne({ productId: productId });
    
    if (!inventory) {
      // Get product details first
      // Product is already imported at the top
      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found' 
        });
      }
      
      // Create new inventory record with all required fields
      inventory = new Inventory({
        productId: productId,
        storeId: product.storeId || '68d9b866b68fb44566d71515', // Use product's store or default
        currentStock: 0,
        availableStock: 0,
        reorderPoint: 10,
        maxStock: 100,
        productDetails: {
          productName: product.productName || product.name,
          costPrice: product.costPrice || 0,
          sellingPrice: product.sellingPrice || product.price || 0,
          barcode: product.barcode,
          unit: product.unit,
          category: product.category,
          brand: product.brand
        },
        stockMovements: []
      });
    } else {
      // Fix existing inventory record if it's missing required fields
      if (!inventory.storeId || !inventory.productDetails) {
        // Product is already imported at the top
        const product = await Product.findById(productId);
        
        if (product) {
          // Update missing fields
          if (!inventory.storeId) {
            inventory.storeId = product.storeId || '68d9b866b68fb44566d71515';
          }
          
          if (!inventory.productDetails) {
            inventory.productDetails = {
              productName: product.productName || product.name,
              costPrice: product.costPrice || 0,
              sellingPrice: product.sellingPrice || product.price || 0,
              barcode: product.barcode,
              unit: product.unit,
              category: product.category,
              brand: product.brand
            };
          }
        }
      }
    }
    
    // Update stock
    inventory.currentStock += adjustment;
    inventory.availableStock = Math.max(0, inventory.currentStock); // Available stock can't be negative
    inventory.lastUpdated = new Date();
    
    // Initialize stockMovements array if it doesn't exist
    if (!inventory.stockMovements) {
      inventory.stockMovements = [];
    }
    
    // Add movement record
    inventory.stockMovements.push({
      type: 'adjustment',
      quantity: adjustment, // Store the actual signed quantity
      reason: reason || 'Manual adjustment',
      referenceId: reference || 'Manual',
      referenceType: 'adjustment',
      performedBy: req.user?.id || '68d9b88797f4b497a5f255b8', // Use current user or default admin
      notes: adjustment > 0 ? 'Stock added' : 'Stock removed',
      timestamp: new Date()
    });
    
    await inventory.save();
    
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust inventory' });
  }
};

// Transfer stock
export const transferStock = async (req, res) => {
  try {
    const { fromStoreId, toStoreId, productId, quantity, reason } = req.body;
    
    // Reduce stock from source store
    const fromInventory = await Inventory.findOne({ 
      productId: productId, 
      storeId: fromStoreId 
    });
    
    if (!fromInventory || fromInventory.currentStock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient stock for transfer' 
      });
    }
    
    fromInventory.currentStock -= quantity;
    fromInventory.movements.push({
      type: 'transfer_out',
      quantity: -quantity,
      reason: reason || 'Stock transfer',
      reference: `Transfer to ${toStoreId}`,
      timestamp: new Date()
    });
    await fromInventory.save();
    
    // Add stock to destination store
    let toInventory = await Inventory.findOne({ 
      productId: productId, 
      storeId: toStoreId 
    });
    
    if (!toInventory) {
      toInventory = new Inventory({
        productId: productId,
        storeId: toStoreId,
        currentStock: 0,
        movements: []
      });
    }
    
    toInventory.currentStock += quantity;
    toInventory.movements.push({
      type: 'transfer_in',
      quantity: quantity,
      reason: reason || 'Stock transfer',
      reference: `Transfer from ${fromStoreId}`,
      timestamp: new Date()
    });
    await toInventory.save();
    
    res.json({ success: true, data: { fromInventory, toInventory } });
  } catch (error) {
    console.error('Error transferring stock:', error);
    res.status(500).json({ success: false, message: 'Failed to transfer stock' });
  }
};

// Update reorder point
export const updateReorderPoint = async (req, res) => {
  try {
    const { productId } = req.params;
    const { reorderPoint } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      productId,
      { reorderPoint },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error updating reorder point:', error);
    res.status(500).json({ success: false, message: 'Failed to update reorder point' });
  }
};

// Get inventory reports
export const getInventoryReports = async (req, res) => {
  try {
    const { period = '30d', storeId } = req.query;
    
    let startDate = new Date();
    switch (period) {
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
        startDate.setDate(startDate.getDate() - 30);
    }
    
    const query = { lastUpdated: { $gte: startDate } };
    if (storeId) {
      query.storeId = storeId;
    }
    
    const inventory = await Inventory.find(query);
    
    const reports = {
      totalItems: inventory.length,
      totalValue: inventory.reduce((sum, item) => 
        sum + (item.currentStock * (item.productDetails?.costPrice || 0)), 0),
      lowStockCount: inventory.filter(item => 
        item.currentStock <= (item.productDetails?.reorderPoint || 10)).length,
      outOfStockCount: inventory.filter(item => item.currentStock === 0).length,
      topProducts: inventory
        .sort((a, b) => b.currentStock - a.currentStock)
        .slice(0, 10)
        .map(item => ({
          productName: item.productDetails?.productName,
          currentStock: item.currentStock,
          value: item.currentStock * (item.productDetails?.costPrice || 0)
        }))
    };
    
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching inventory reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory reports' });
  }
};

// Get stock history for a specific product
export const getStockHistory = async (req, res) => {
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
};