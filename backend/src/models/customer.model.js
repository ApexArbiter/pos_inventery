import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    
    // Address Information
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: "India" },
    },
    
    // Customer Details
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    occupation: {
      type: String,
    },
    
    // Store Association
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    
    // Customer Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // Loyalty Program
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyTier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      default: "bronze",
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Customer Preferences
    preferences: {
      language: { type: String, default: "en" },
      communication: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      categories: [String], // Preferred product categories
    },
    
    // Transaction History Summary
    transactionStats: {
      totalTransactions: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      lastTransactionDate: { type: Date },
      firstTransactionDate: { type: Date },
    },
    
    // Notes and Tags
    notes: {
      type: String,
    },
    tags: [String],
    
    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
customerSchema.index({ customerId: 1 });
customerSchema.index({ storeId: 1, phone: 1 });
customerSchema.index({ storeId: 1, email: 1 });
customerSchema.index({ storeId: 1, isActive: 1 });
customerSchema.index({ storeId: 1, loyaltyTier: 1 });

// Pre-save middleware to generate customer ID
customerSchema.pre("save", async function (next) {
  if (!this.customerId) {
    const count = await mongoose.models.Customer.countDocuments({ storeId: this.storeId });
    this.customerId = `CUST-${this.storeId.toString().slice(-4)}-${String(count + 1).padStart(4, "0")}`;
  }
  
  // Update loyalty tier based on total spent
  if (this.totalSpent >= 50000) {
    this.loyaltyTier = "platinum";
  } else if (this.totalSpent >= 25000) {
    this.loyaltyTier = "gold";
  } else if (this.totalSpent >= 10000) {
    this.loyaltyTier = "silver";
  } else {
    this.loyaltyTier = "bronze";
  }
  
  next();
});

// Method to add loyalty points
customerSchema.methods.addLoyaltyPoints = function (points, reason = "Purchase") {
  this.loyaltyPoints += points;
  return this.save();
};

// Method to redeem loyalty points
customerSchema.methods.redeemLoyaltyPoints = function (points) {
  if (this.loyaltyPoints < points) {
    throw new Error("Insufficient loyalty points");
  }
  this.loyaltyPoints -= points;
  return this.save();
};

// Method to update transaction stats
customerSchema.methods.updateTransactionStats = function (amount) {
  this.transactionStats.totalTransactions += 1;
  this.transactionStats.totalAmount += amount;
  this.transactionStats.averageOrderValue = this.transactionStats.totalAmount / this.transactionStats.totalTransactions;
  this.transactionStats.lastTransactionDate = new Date();
  
  if (!this.transactionStats.firstTransactionDate) {
    this.transactionStats.firstTransactionDate = new Date();
  }
  
  this.totalSpent = this.transactionStats.totalAmount;
  return this.save();
};

// Method to get customer summary
customerSchema.methods.getSummary = function () {
  return {
    customerId: this.customerId,
    name: this.name,
    phone: this.phone,
    email: this.email,
    loyaltyTier: this.loyaltyTier,
    loyaltyPoints: this.loyaltyPoints,
    totalSpent: this.totalSpent,
    totalTransactions: this.transactionStats.totalTransactions,
    lastTransactionDate: this.transactionStats.lastTransactionDate,
  };
};

// Static method to search customers
customerSchema.statics.searchCustomers = function (storeId, query, options = {}) {
  const searchQuery = {
    storeId,
    isActive: true,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { phone: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
      { customerId: { $regex: query, $options: "i" } },
    ],
  };
  
  return this.find(searchQuery)
    .sort(options.sort || { name: 1 })
    .limit(options.limit || 50);
};

// Static method to get customer analytics
customerSchema.statics.getCustomerAnalytics = function (storeId) {
  return this.aggregate([
    { $match: { storeId: mongoose.Types.ObjectId(storeId), isActive: true } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        totalLoyaltyPoints: { $sum: "$loyaltyPoints" },
        totalSpent: { $sum: "$totalSpent" },
        averageSpent: { $avg: "$totalSpent" },
        loyaltyTierBreakdown: {
          $push: {
            tier: "$loyaltyTier",
            spent: "$totalSpent",
          },
        },
      },
    },
  ]);
};

// Static method to get top customers
customerSchema.statics.getTopCustomers = function (storeId, limit = 10) {
  return this.find({ storeId, isActive: true })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .select("customerId name phone email loyaltyTier totalSpent transactionStats.totalTransactions");
};

// Static method to get customers by loyalty tier
customerSchema.statics.getCustomersByTier = function (storeId, tier) {
  return this.find({ storeId, isActive: true, loyaltyTier: tier })
    .sort({ totalSpent: -1 });
};

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
