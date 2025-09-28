import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    
    // Role and Permissions
    role: {
      type: String,
      enum: ["super_admin", "store_admin", "billing_staff", "inventory_staff"],
      default: "billing_staff",
    },
    permissions: [{
      type: String,
      enum: [
        "view_dashboard",
        "manage_products",
        "manage_inventory",
        "process_bills",
        "manage_customers",
        "view_reports",
        "manage_users",
        "manage_store",
        "manage_subscription",
        "manage_categories",
        "manage_suppliers",
        "view_analytics",
        "export_data",
        "manage_settings",
      ],
    }],
    
    // Store Association
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    
    // User Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    
    // Profile Information
    profileImage: {
      type: String,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: "India" },
    },
    
    // Device and Session Information
    deviceInfo: {
      type: String,
    },
    lastDeviceInfo: {
      type: String,
    },
    sessionToken: {
      type: String,
    },
    
    // Preferences
    preferences: {
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Asia/Kolkata" },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      notifications: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
    },
    
    // Legacy fields for backward compatibility
    profilePic: { type: String }, // Maps to profileImage
    whatsappNumber: { type: String }, // Maps to phone
    isAuthenticated: { type: Boolean, default: false }, // Maps to isVerified
    
    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
userSchema.index({ email: 1 });
userSchema.index({ storeId: 1, role: 1 });
userSchema.index({ storeId: 1, isActive: 1 });
userSchema.index({ phone: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user is locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Check if user has permission
userSchema.methods.hasPermission = function (permission) {
  // Super admin has all permissions
  if (this.role === "super_admin") return true;
  
  // Store admin has most permissions except super admin specific ones
  if (this.role === "store_admin") {
    const restrictedPermissions = ["manage_subscription"];
    return !restrictedPermissions.includes(permission);
  }
  
  // Check specific permissions for other roles
  return this.permissions.includes(permission);
};

// Check if user can access store
userSchema.methods.canAccessStore = function (storeId) {
  // Super admin can access all stores
  if (this.role === "super_admin") return true;
  
  // Other users can only access their assigned store
  return this.storeId.toString() === storeId.toString();
};

// Get user's accessible features based on role and permissions
userSchema.methods.getAccessibleFeatures = function () {
  const roleFeatures = {
    super_admin: [
      "view_dashboard", "manage_products", "manage_inventory", "process_bills",
      "manage_customers", "view_reports", "manage_users", "manage_store",
      "manage_subscription", "manage_categories", "manage_suppliers",
      "view_analytics", "export_data", "manage_settings"
    ],
    store_admin: [
      "view_dashboard", "manage_products", "manage_inventory", "process_bills",
      "manage_customers", "view_reports", "manage_users", "manage_store",
      "manage_categories", "manage_suppliers", "view_analytics", "export_data", "manage_settings"
    ],
    billing_staff: [
      "view_dashboard", "process_bills", "manage_customers", "view_reports"
    ],
    inventory_staff: [
      "view_dashboard", "manage_products", "manage_inventory", "manage_categories",
      "manage_suppliers", "view_reports"
    ],
  };
  
  const baseFeatures = roleFeatures[this.role] || [];
  const additionalFeatures = this.permissions.filter(p => !baseFeatures.includes(p));
  
  return [...baseFeatures, ...additionalFeatures];
};

// Static method to get users by store
userSchema.statics.getUsersByStore = function (storeId, options = {}) {
  const query = { storeId, isActive: true };
  
  if (options.role) {
    query.role = options.role;
  }
  
  return this.find(query)
    .select("-password")
    .populate("storeId", "storeName")
    .sort({ createdAt: -1 });
};

// Static method to get user statistics
userSchema.statics.getUserStats = function (storeId) {
  return this.aggregate([
    { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
        },
      },
    },
  ]);
};

const User = mongoose.model("User", userSchema);

export default User;
