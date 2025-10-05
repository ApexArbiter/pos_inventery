import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["in", "out", "adjustment", "return", "damage", "transfer"],
  },
  quantity: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  referenceId: {
    type: String, // Transaction ID, Purchase Order ID, etc.
  },
  referenceType: {
    type: String,
    enum: ["sale", "purchase", "adjustment", "return", "damage", "transfer"],
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  notes: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productDetails: {
      productName: { type: String, required: true },
      barcode: { type: String },
      description: { type: String },
      category: { type: String },
      mrp: { type: Number },
      sellingPrice: { type: Number, required: true },
      costPrice: { type: Number, required: true },
      unit: { type: String, default: 'pcs' },
      images: [{ type: String }],
      isActive: { type: Boolean, default: true },
      isReturnable: { type: Boolean, default: true },
      minStockLevel: { type: Number, default: 10 },
      maxStockLevel: { type: Number, default: 100 },
      reorderPoint: { type: Number, default: 15 }
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    
    // Current Stock Levels
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Stock Management
    reorderPoint: {
      type: Number,
      default: 10,
      min: 0,
    },
    reorderQuantity: {
      type: Number,
      default: 50,
      min: 0,
    },
    maxStockLevel: {
      type: Number,
      default: 1000,
      min: 0,
    },
    
    // Tracking Information
    lastRestocked: {
      type: Date,
    },
    lastSold: {
      type: Date,
    },
    averageDailySales: {
      type: Number,
      default: 0,
    },
    daysOfStock: {
      type: Number,
      default: 0,
    },
    
    // Stock Movement History
    stockMovements: [stockMovementSchema],
    
    // Alerts and Notifications
    alerts: {
      lowStock: {
        isActive: { type: Boolean, default: false },
        triggeredAt: { type: Date },
        resolvedAt: { type: Date },
      },
      outOfStock: {
        isActive: { type: Boolean, default: false },
        triggeredAt: { type: Date },
        resolvedAt: { type: Date },
      },
      expiry: {
        isActive: { type: Boolean, default: false },
        triggeredAt: { type: Date },
        resolvedAt: { type: Date },
      },
    },
    
    // Cost Tracking
    averageCost: {
      type: Number,
      default: 0,
    },
    lastCost: {
      type: Number,
      default: 0,
    },
    totalValue: {
      type: Number,
      default: 0,
    },
    
    // Audit Fields
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
inventorySchema.index({ productId: 1, storeId: 1 }, { unique: true });
inventorySchema.index({ storeId: 1, currentStock: 1 });
inventorySchema.index({ storeId: 1, "alerts.lowStock.isActive": 1 });
inventorySchema.index({ storeId: 1, "alerts.outOfStock.isActive": 1 });

// Pre-save middleware to calculate available stock
inventorySchema.pre("save", function (next) {
  this.availableStock = Math.max(0, this.currentStock - this.reservedStock);
  
  // Update total value
  this.totalValue = this.currentStock * (this.productDetails?.costPrice || 0);
  
  // Check for alerts
  this.checkAlerts();
  
  next();
});

// Method to add stock
inventorySchema.methods.addStock = function (quantity, reason, performedBy, referenceId = null, referenceType = null) {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }
  
  this.currentStock += quantity;
  this.lastRestocked = new Date();
  
  // Add stock movement record
  this.stockMovements.push({
    type: "in",
    quantity,
    reason,
    referenceId,
    referenceType,
    performedBy,
    timestamp: new Date(),
  });
  
  // Update average cost if provided
  if (this.stockMovements.length > 0) {
    this.calculateAverageCost();
  }
  
  this.checkAlerts();
  return this.save();
};

// Method to remove stock
inventorySchema.methods.removeStock = function (quantity, reason, performedBy, referenceId = null, referenceType = null) {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }
  
  if (this.currentStock < quantity) {
    throw new Error("Insufficient stock");
  }
  
  this.currentStock -= quantity;
  this.lastSold = new Date();
  
  // Add stock movement record
  this.stockMovements.push({
    type: "out",
    quantity: -quantity,
    reason,
    referenceId,
    referenceType,
    performedBy,
    timestamp: new Date(),
  });
  
  this.checkAlerts();
  return this.save();
};

// Method to adjust stock
inventorySchema.methods.adjustStock = function (newQuantity, reason, performedBy, notes = "") {
  const difference = newQuantity - this.currentStock;
  
  this.currentStock = newQuantity;
  
  // Add stock movement record
  this.stockMovements.push({
    type: "adjustment",
    quantity: difference,
    reason,
    performedBy,
    notes,
    timestamp: new Date(),
  });
  
  this.checkAlerts();
  return this.save();
};

// Method to reserve stock
inventorySchema.methods.reserveStock = function (quantity) {
  if (this.availableStock < quantity) {
    throw new Error("Insufficient available stock");
  }
  
  this.reservedStock += quantity;
  return this.save();
};

// Method to release reserved stock
inventorySchema.methods.releaseReservedStock = function (quantity) {
  this.reservedStock = Math.max(0, this.reservedStock - quantity);
  return this.save();
};

// Method to check and update alerts
inventorySchema.methods.checkAlerts = function () {
  const product = this.productId;
  
  // Low stock alert
  if (this.currentStock <= this.reorderPoint && this.currentStock > 0) {
    if (!this.alerts.lowStock.isActive) {
      this.alerts.lowStock.isActive = true;
      this.alerts.lowStock.triggeredAt = new Date();
    }
  } else {
    if (this.alerts.lowStock.isActive) {
      this.alerts.lowStock.isActive = false;
      this.alerts.lowStock.resolvedAt = new Date();
    }
  }
  
  // Out of stock alert
  if (this.currentStock <= 0) {
    if (!this.alerts.outOfStock.isActive) {
      this.alerts.outOfStock.isActive = true;
      this.alerts.outOfStock.triggeredAt = new Date();
    }
  } else {
    if (this.alerts.outOfStock.isActive) {
      this.alerts.outOfStock.isActive = false;
      this.alerts.outOfStock.resolvedAt = new Date();
    }
  }
  
  // Expiry alert (if product has expiry date)
  if (product && product.expiryDate) {
    const daysUntilExpiry = Math.ceil((product.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      if (!this.alerts.expiry.isActive) {
        this.alerts.expiry.isActive = true;
        this.alerts.expiry.triggeredAt = new Date();
      }
    } else {
      if (this.alerts.expiry.isActive) {
        this.alerts.expiry.isActive = false;
        this.alerts.expiry.resolvedAt = new Date();
      }
    }
  }
};

// Method to calculate average cost
inventorySchema.methods.calculateAverageCost = function () {
  const incomingMovements = this.stockMovements.filter(movement => movement.type === "in");
  
  if (incomingMovements.length === 0) {
    this.averageCost = 0;
    return;
  }
  
  let totalCost = 0;
  let totalQuantity = 0;
  
  incomingMovements.forEach(movement => {
    // Assuming cost is stored in notes or referenceId for now
    // In a real implementation, you'd have a separate cost field
    totalQuantity += movement.quantity;
  });
  
  this.averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
};

// Method to calculate days of stock
inventorySchema.methods.calculateDaysOfStock = function () {
  if (this.averageDailySales <= 0) {
    this.daysOfStock = 0;
    return;
  }
  
  this.daysOfStock = Math.floor(this.currentStock / this.averageDailySales);
};

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function (storeId) {
  return this.find({
    storeId,
    $or: [
      { "alerts.lowStock.isActive": true },
      { "alerts.outOfStock.isActive": true },
    ],
  }).populate("productId", "productName barcode category");
};

// Static method to get inventory summary
inventorySchema.statics.getInventorySummary = function (storeId) {
  return this.aggregate([
    { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStockValue: { $sum: "$totalValue" },
        lowStockItems: {
          $sum: {
            $cond: [{ $eq: ["$alerts.lowStock.isActive", true] }, 1, 0],
          },
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ["$alerts.outOfStock.isActive", true] }, 1, 0],
          },
        },
      },
    },
  ]);
};

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
