import mongoose from 'mongoose';

const transactionItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  barcode: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unit: {
    type: String,
    required: true,
  },
  mrp: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountType: {
    type: String,
    enum: ["amount", "percentage"],
    default: "amount",
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  gstRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  isReturned: {
    type: Boolean,
    default: false,
  },
  returnQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  returnReason: {
    type: String,
  },
  returnDate: {
    type: Date,
  },
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ["cash", "card", "upi", "wallet", "net_banking", "cheque", "credit"],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  reference: {
    type: String, // Transaction reference, UPI ID, etc.
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "completed",
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
});

const transactionSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    
    // Customer Information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerInfo: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    
    // Transaction Items
    items: [transactionItemSchema],
    
    // Pricing Summary
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Payment Information
    payments: [paymentSchema],
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "card", "upi", "wallet", "net_banking", "cheque", "credit", "mixed"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "partial", "failed", "refunded"],
      default: "completed",
    },
    changeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Transaction Status
    status: {
      type: String,
      enum: ["completed", "cancelled", "refunded", "partially_refunded"],
      default: "completed",
    },
    
    // Bill Information
    billGeneratedAt: {
      type: Date,
      default: Date.now,
    },
    billType: {
      type: String,
      enum: ["sale", "return", "exchange"],
      default: "sale",
    },
    
    // WhatsApp Integration
    whatsappSent: {
      type: Boolean,
      default: false,
    },
    whatsappMessageId: {
      type: String,
    },
    whatsappSentAt: {
      type: Date,
    },
    
    // Staff Information
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cashierName: {
      type: String,
      required: true,
    },
    
    // Additional Information
    notes: {
      type: String,
    },
    tags: [String],
    
    // Return/Refund Information
    isReturned: {
      type: Boolean,
      default: false,
    },
    returnTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    
    // Audit Fields
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
transactionSchema.index({ billNumber: 1 });
transactionSchema.index({ storeId: 1, createdAt: -1 });
transactionSchema.index({ storeId: 1, cashierId: 1 });
transactionSchema.index({ storeId: 1, status: 1 });
transactionSchema.index({ "customerInfo.phone": 1 });
transactionSchema.index({ paymentStatus: 1 });

// Pre-save middleware to generate bill number
transactionSchema.pre("save", async function (next) {
  if (!this.billNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await mongoose.models.Transaction.countDocuments({
      storeId: this.storeId,
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    });
    this.billNumber = `BILL-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }
  
  // Calculate totals
  this.calculateTotals();
  
  next();
});

// Method to calculate transaction totals
transactionSchema.methods.calculateTotals = function () {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalGstAmount = 0;
  
  this.items.forEach(item => {
    const itemSubtotal = item.sellingPrice * item.quantity;
    const itemDiscount = item.discountType === "percentage" 
      ? (itemSubtotal * item.discount) / 100 
      : item.discount;
    const itemAfterDiscount = itemSubtotal - itemDiscount;
    const itemGstAmount = (itemAfterDiscount * item.gstRate) / 100;
    
    item.discountAmount = itemDiscount;
    item.gstAmount = itemGstAmount;
    item.totalAmount = itemAfterDiscount + itemGstAmount;
    
    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalGstAmount += itemGstAmount;
  });
  
  this.subtotal = subtotal;
  this.totalDiscount = totalDiscount;
  this.totalGstAmount = totalGstAmount;
  this.finalAmount = subtotal - totalDiscount + totalGstAmount;
};

// Method to add item to transaction
transactionSchema.methods.addItem = function (product, quantity, discount = 0, discountType = "amount") {
  const existingItemIndex = this.items.findIndex(item => item.productId.toString() === product._id.toString());
  
  if (existingItemIndex >= 0) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    this.items.push({
      productId: product._id,
      barcode: product.barcode,
      productName: product.productName,
      category: product.category,
      brand: product.brand,
      quantity,
      unit: product.unit,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      discount,
      discountType,
      gstRate: product.gstRate,
    });
  }
  
  this.calculateTotals();
  return this.save();
};

// Method to remove item from transaction
transactionSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter(item => item.productId.toString() !== productId.toString());
  this.calculateTotals();
  return this.save();
};

// Method to update item quantity
transactionSchema.methods.updateItemQuantity = function (productId, quantity) {
  const item = this.items.find(item => item.productId.toString() === productId.toString());
  if (item) {
    item.quantity = quantity;
    this.calculateTotals();
    return this.save();
  }
  throw new Error("Item not found in transaction");
};

// Method to process payment
transactionSchema.methods.processPayment = function (paymentMethod, amount, reference = null) {
  this.payments.push({
    method: paymentMethod,
    amount,
    reference,
    status: "completed",
  });
  
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  if (totalPaid >= this.finalAmount) {
    this.paymentStatus = "completed";
    this.changeAmount = totalPaid - this.finalAmount;
  } else {
    this.paymentStatus = "partial";
    this.changeAmount = 0;
  }
  
  return this.save();
};

// Method to mark WhatsApp as sent
transactionSchema.methods.markWhatsAppSent = function (messageId) {
  this.whatsappSent = true;
  this.whatsappMessageId = messageId;
  this.whatsappSentAt = new Date();
  return this.save();
};

// Method to create return transaction
transactionSchema.methods.createReturn = function (returnItems, reason, cashierId) {
  const returnTransaction = new mongoose.models.Transaction({
    storeId: this.storeId,
    customerInfo: this.customerInfo,
    items: returnItems,
    billType: "return",
    originalTransactionId: this._id,
    cashierId,
    cashierName: this.cashierName,
    notes: `Return for ${this.billNumber}. Reason: ${reason}`,
  });
  
  return returnTransaction.save();
};

// Static method to get daily sales summary
transactionSchema.statics.getDailySales = function (storeId, date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        storeId: mongoose.Types.ObjectId(storeId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: "$finalAmount" },
        totalItems: { $sum: { $sum: "$items.quantity" } },
        averageTransactionValue: { $avg: "$finalAmount" },
      },
    },
  ]);
};

// Static method to get sales by payment method
transactionSchema.statics.getSalesByPaymentMethod = function (storeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        storeId: mongoose.Types.ObjectId(storeId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: "completed",
      },
    },
    {
      $unwind: "$payments",
    },
    {
      $group: {
        _id: "$payments.method",
        totalAmount: { $sum: "$payments.amount" },
        transactionCount: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get top selling products
transactionSchema.statics.getTopSellingProducts = function (storeId, startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        storeId: mongoose.Types.ObjectId(storeId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: "completed",
      },
    },
    {
      $unwind: "$items",
    },
    {
      $group: {
        _id: "$items.productId",
        productName: { $first: "$items.productName" },
        totalQuantity: { $sum: "$items.quantity" },
        totalAmount: { $sum: "$items.totalAmount" },
        averagePrice: { $avg: "$items.sellingPrice" },
      },
    },
    {
      $sort: { totalQuantity: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
