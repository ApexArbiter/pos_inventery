import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  referenceId: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["credit_card", "debit_card", "net_banking", "upi", "wallet", "bank_transfer"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "completed",
  },
  invoiceUrl: {
    type: String,
  },
  notes: {
    type: String,
  },
});

const renewalReminderSchema = new mongoose.Schema({
  reminderDate: {
    type: Date,
    required: true,
  },
  sent: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
  },
  reminderType: {
    type: String,
    enum: ["30_days", "15_days", "7_days", "1_day", "expired"],
  },
  channel: {
    type: String,
    enum: ["email", "whatsapp", "sms"],
  },
});

const subscriptionSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },
    
    // Subscription Plan Details
    planType: {
      type: String,
      required: true,
      enum: ["basic", "premium", "enterprise"],
    },
    planName: {
      type: String,
      required: true,
    },
    planDescription: {
      type: String,
    },
    
    // Subscription Period
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    
    // Subscription Status
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "suspended", "pending"],
      default: "active",
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    
    // Pricing Information
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    
    // Features and Limits
    features: {
      barcodeScanning: { type: Boolean, default: true },
      inventoryManagement: { type: Boolean, default: true },
      multiStore: { type: Boolean, default: false },
      analytics: { type: Boolean, default: true },
      whatsappIntegration: { type: Boolean, default: true },
      customerManagement: { type: Boolean, default: true },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      dataExport: { type: Boolean, default: true },
      backupService: { type: Boolean, default: false },
    },
    limits: {
      maxProducts: { type: Number, default: 1000 },
      maxTransactions: { type: Number, default: 10000 },
      maxUsers: { type: Number, default: 5 },
      maxStores: { type: Number, default: 1 },
      maxStorage: { type: Number, default: 1024 }, // in MB
      apiCallsPerMonth: { type: Number, default: 1000 },
    },
    
    // Payment Information
    paymentHistory: [paymentHistorySchema],
    nextBillingDate: {
      type: Date,
    },
    lastPaymentDate: {
      type: Date,
    },
    
    // Renewal and Reminders
    renewalReminders: [renewalReminderSchema],
    lastReminderSent: {
      type: Date,
    },
    
    // Cancellation Information
    cancellationDate: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    // Trial Information
    isTrial: {
      type: Boolean,
      default: false,
    },
    trialStartDate: {
      type: Date,
    },
    trialEndDate: {
      type: Date,
    },
    trialConverted: {
      type: Boolean,
      default: false,
    },
    
    // Additional Information
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
subscriptionSchema.index({ storeId: 1 });
subscriptionSchema.index({ expiryDate: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ planType: 1 });
subscriptionSchema.index({ isActive: 1 });

// Pre-save middleware to calculate final price and set next billing date
subscriptionSchema.pre("save", function (next) {
  // Calculate final price
  this.finalPrice = this.basePrice - this.discountAmount;
  
  // Set next billing date based on billing cycle
  if (this.isActive && this.autoRenew) {
    const nextBilling = new Date(this.expiryDate);
    switch (this.billingCycle) {
      case "monthly":
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        break;
      case "quarterly":
        nextBilling.setMonth(nextBilling.getMonth() + 3);
        break;
      case "yearly":
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        break;
    }
    this.nextBillingDate = nextBilling;
  }
  
  // Update status based on expiry date
  if (new Date() > this.expiryDate && this.status === "active") {
    this.status = "expired";
    this.isActive = false;
  }
  
  next();
});

// Virtual for days until expiry
subscriptionSchema.virtual("daysUntilExpiry").get(function () {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for subscription status
subscriptionSchema.virtual("subscriptionStatus").get(function () {
  if (!this.isActive) return "inactive";
  if (this.status === "cancelled") return "cancelled";
  if (this.status === "suspended") return "suspended";
  if (new Date() > this.expiryDate) return "expired";
  if (this.daysUntilExpiry <= 7) return "expiring_soon";
  return "active";
});

// Method to check if store has access to a feature
subscriptionSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true;
};

// Method to check subscription limits
subscriptionSchema.methods.checkLimit = function (limitType, currentCount) {
  return currentCount < this.limits[limitType];
};

// Method to add payment record
subscriptionSchema.methods.addPayment = function (paymentData) {
  this.paymentHistory.push({
    amount: paymentData.amount,
    referenceId: paymentData.referenceId,
    paymentMethod: paymentData.paymentMethod,
    status: paymentData.status || "completed",
    invoiceUrl: paymentData.invoiceUrl,
    notes: paymentData.notes,
  });
  
  this.lastPaymentDate = new Date();
  return this.save();
};

// Method to renew subscription
subscriptionSchema.methods.renewSubscription = function (renewalPeriod = null) {
  const period = renewalPeriod || this.billingCycle;
  const newExpiryDate = new Date(this.expiryDate);
  
  switch (period) {
    case "monthly":
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
      break;
    case "quarterly":
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 3);
      break;
    case "yearly":
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
      break;
  }
  
  this.expiryDate = newExpiryDate;
  this.status = "active";
  this.isActive = true;
  
  return this.save();
};

// Method to cancel subscription
subscriptionSchema.methods.cancelSubscription = function (reason, cancelledBy) {
  this.status = "cancelled";
  this.isActive = false;
  this.cancellationDate = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.autoRenew = false;
  
  return this.save();
};

// Method to upgrade/downgrade plan
subscriptionSchema.methods.changePlan = function (newPlanType, newFeatures, newLimits) {
  this.planType = newPlanType;
  this.features = { ...this.features, ...newFeatures };
  this.limits = { ...this.limits, ...newLimits };
  
  return this.save();
};

// Method to add renewal reminder
subscriptionSchema.methods.addRenewalReminder = function (reminderType, daysBeforeExpiry) {
  const reminderDate = new Date(this.expiryDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeExpiry);
  
  this.renewalReminders.push({
    reminderDate,
    reminderType,
    sent: false,
  });
  
  return this.save();
};

// Static method to get expiring subscriptions
subscriptionSchema.statics.getExpiringSubscriptions = function (days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    isActive: true,
    status: "active",
    expiryDate: { $lte: futureDate },
  }).populate("storeId", "storeName contact.email");
};

// Static method to get subscription analytics
subscriptionSchema.statics.getSubscriptionAnalytics = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$planType",
        count: { $sum: 1 },
        totalRevenue: { $sum: "$finalPrice" },
        activeSubscriptions: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        expiredSubscriptions: {
          $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] },
        },
      },
    },
  ]);
};

// Static method to get revenue analytics
subscriptionSchema.statics.getRevenueAnalytics = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        "paymentHistory.paymentDate": { $gte: startDate, $lte: endDate },
        "paymentHistory.status": "completed",
      },
    },
    {
      $unwind: "$paymentHistory",
    },
    {
      $match: {
        "paymentHistory.paymentDate": { $gte: startDate, $lte: endDate },
        "paymentHistory.status": "completed",
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$paymentHistory.paymentDate" },
          year: { $year: "$paymentHistory.paymentDate" },
        },
        totalRevenue: { $sum: "$paymentHistory.amount" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
