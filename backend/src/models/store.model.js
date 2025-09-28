import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeImage: {
      type: String,
      default: "",
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
      whatsapp: { type: String },
    },
    business: {
      gstNumber: { type: String },
      licenseNumber: { type: String },
      businessType: { 
        type: String, 
        enum: ["supermarket", "retail_store", "shopping_mall", "convenience_store"],
        default: "supermarket"
      },
    },
    subscription: {
      subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
      planType: { 
        type: String, 
        enum: ["basic", "premium", "enterprise"],
        default: "basic"
      },
      startDate: { type: Date, default: Date.now },
      expiryDate: { type: Date, required: true },
      isActive: { type: Boolean, default: true },
      autoRenew: { type: Boolean, default: false },
    },
    branding: {
      logo: { type: String, default: "" },
      primaryColor: { type: String, default: "#3b82f6" },
      secondaryColor: { type: String, default: "#10b981" },
      billTemplate: { 
        type: String, 
        enum: ["standard", "modern", "minimal"],
        default: "standard"
      },
      footerMessage: { type: String, default: "Thank you for shopping with us!" },
    },
    settings: {
      currency: { type: String, default: "INR" },
      timezone: { type: String, default: "Asia/Kolkata" },
      language: { type: String, default: "en" },
      taxInclusive: { type: Boolean, default: true },
      allowNegativeStock: { type: Boolean, default: false },
      lowStockThreshold: { type: Number, default: 10 },
      receiptPrinter: { type: String, default: "thermal" },
    },
    features: {
      barcodeScanning: { type: Boolean, default: true },
      inventoryManagement: { type: Boolean, default: true },
      multiStore: { type: Boolean, default: false },
      analytics: { type: Boolean, default: true },
      whatsappIntegration: { type: Boolean, default: true },
      customerManagement: { type: Boolean, default: true },
    },
    limits: {
      maxProducts: { type: Number, default: 1000 },
      maxTransactions: { type: Number, default: 10000 },
      maxUsers: { type: Number, default: 5 },
      maxStores: { type: Number, default: 1 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
storeSchema.index({ storeId: 1 });
storeSchema.index({ "subscription.expiryDate": 1 });
storeSchema.index({ isActive: 1 });

// Pre-save middleware to generate store ID
storeSchema.pre("save", async function (next) {
  if (!this.storeId) {
    const count = await mongoose.models.Store.countDocuments();
    this.storeId = `STORE-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Virtual for subscription status
storeSchema.virtual("subscriptionStatus").get(function () {
  if (!this.subscription.isActive) return "inactive";
  if (new Date() > this.subscription.expiryDate) return "expired";
  if (new Date(this.subscription.expiryDate) - new Date() < 7 * 24 * 60 * 60 * 1000) return "expiring_soon";
  return "active";
});

// Method to check if store has access to a feature
storeSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true;
};

// Method to check subscription limits
storeSchema.methods.checkLimit = function (limitType, currentCount) {
  return currentCount < this.limits[limitType];
};

const Store = mongoose.model("Store", storeSchema);

export default Store;
