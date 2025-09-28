import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Basic Product Information
    barcode: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    
    // Categorization
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    
    // Pricing Information
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
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    
    // Tax Information
    gstRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    
    // Product Specifications
    unit: {
      type: String,
      required: true,
      enum: ["kg", "ltr", "pcs", "gms", "ml", "box", "pack", "dozen", "pair"],
      default: "pcs",
    },
    weight: {
      value: { type: Number },
      unit: { type: String, enum: ["g", "kg", "ml", "l"] },
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, enum: ["cm", "m", "inch"] },
    },
    
    // Stock Management
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxStockLevel: {
      type: Number,
      default: 1000,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      default: 10,
      min: 0,
    },
    
    // Product Attributes
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isReturnable: {
      type: Boolean,
      default: true,
    },
    expiryDate: {
      type: Date,
    },
    manufacturingDate: {
      type: Date,
    },
    
    // Media
    images: [{
      url: { type: String, required: true },
      alt: { type: String },
      isPrimary: { type: Boolean, default: false },
    }],
    
    // Store Association
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    
    // Supplier Information
    supplier: {
      name: { type: String },
      contact: { type: String },
      email: { type: String },
    },
    
    // Additional Information
    tags: [String],
    notes: {
      type: String,
    },
    
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
    
    // Legacy fields for backward compatibility
    name: { type: String }, // Maps to productName
    items: [{ type: String }], // For combo/deal products
    price: { type: Number }, // Maps to sellingPrice
    minPersons: { type: Number }, // Legacy field
    image: { type: String }, // Legacy field - maps to primary image
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
productSchema.index({ barcode: 1 });
productSchema.index({ storeId: 1, category: 1 });
productSchema.index({ storeId: 1, productName: "text" });
productSchema.index({ storeId: 1, brand: 1 });
productSchema.index({ storeId: 1, isActive: 1 });

// Pre-save middleware to generate barcode if not provided
productSchema.pre("save", async function (next) {
  // Generate barcode if not provided
  if (!this.barcode) {
    const count = await mongoose.models.Product.countDocuments({ storeId: this.storeId });
    this.barcode = `${this.storeId.toString().slice(-4)}${String(count + 1).padStart(6, "0")}`;
  }
  
  // Map legacy fields
  if (this.name && !this.productName) {
    this.productName = this.name;
  }
  if (this.price && !this.sellingPrice) {
    this.sellingPrice = this.price;
  }
  if (this.image && this.images.length === 0) {
    this.images = [{ url: this.image, isPrimary: true }];
  }
  
  next();
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  const primaryImg = this.images.find(img => img.isPrimary);
  return primaryImg ? primaryImg.url : (this.images.length > 0 ? this.images[0].url : "");
});

// Method to check if product is low in stock
productSchema.methods.isLowStock = function (currentStock) {
  return currentStock <= this.reorderPoint;
};

// Method to check if product is out of stock
productSchema.methods.isOutOfStock = function (currentStock) {
  return currentStock <= 0;
};

// Static method to search products
productSchema.statics.searchProducts = function (storeId, query, options = {}) {
  const searchQuery = {
    storeId,
    isActive: true,
    $or: [
      { productName: { $regex: query, $options: "i" } },
      { barcode: query },
      { brand: { $regex: query, $options: "i" } },
      { tags: { $in: [new RegExp(query, "i")] } },
    ],
  };
  
  return this.find(searchQuery)
    .populate("category", "name")
    .sort(options.sort || { productName: 1 })
    .limit(options.limit || 50);
};

const Product = mongoose.model("Product", productSchema);

export default Product;
