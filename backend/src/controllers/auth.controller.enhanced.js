import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Store from "../models/store.model.js";
import Subscription from "../models/subscription.model.js";
import { generateToken } from "../utils/token.js";
import cloudinary from "../lib/cloudinary.js";

// Enhanced signup for store registration
export const registerStore = async (req, res) => {
  const {
    // Store Information
    storeName,
    storeImage,
    address,
    contact,
    business,
    
    // Admin User Information
    fullName,
    email,
    password,
    phone,
    
    // Subscription Information
    planType = "basic",
  } = req.body;

  try {
    // Validate required fields
    if (!storeName || !fullName || !email || !password || !address || !contact) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Create store
    const newStore = new Store({
      storeName,
      storeImage,
      address,
      contact,
      business,
      subscription: {
        planType,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
        isActive: true,
      },
      createdBy: null, // Will be updated after user creation
    });

    const savedStore = await newStore.save();

    // Create subscription record
    const subscription = new Subscription({
      storeId: savedStore._id,
      planType,
      planName: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
      planDescription: `${planType} subscription plan for POS system`,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
      basePrice: planType === "basic" ? 5000 : planType === "premium" ? 10000 : 20000,
      finalPrice: planType === "basic" ? 5000 : planType === "premium" ? 10000 : 20000,
      features: getSubscriptionFeatures(planType),
      limits: getSubscriptionLimits(planType),
      createdBy: null, // Will be updated after user creation
    });

    const savedSubscription = await subscription.save();

    // Update store with subscription ID
    savedStore.subscription.subscriptionId = savedSubscription._id;

    // Create admin user for the store
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phone,
      role: "store_admin",
      storeId: savedStore._id,
      branch: "Main Branch",
      isActive: true,
      isVerified: true,
      permissions: [
        "view_dashboard",
        "manage_products",
        "manage_inventory",
        "process_bills",
        "manage_customers",
        "view_reports",
        "manage_users",
        "manage_store",
        "manage_categories",
        "manage_suppliers",
        "view_analytics",
        "export_data",
        "manage_settings",
      ],
    });

    const savedUser = await newUser.save();

    // Update store and subscription with created user
    savedStore.createdBy = savedUser._id;
    savedSubscription.createdBy = savedUser._id;
    
    await savedStore.save();
    await savedSubscription.save();

    // Generate token
    const token = generateToken(savedUser._id, res);

    res.status(201).json({
      success: true,
      message: "Store registered successfully!",
      store: {
        _id: savedStore._id,
        storeId: savedStore.storeId,
        storeName: savedStore.storeName,
        subscriptionStatus: savedStore.subscriptionStatus,
      },
      user: {
        _id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        storeId: savedUser.storeId,
        permissions: savedUser.getAccessibleFeatures(),
      },
      subscription: {
        planType: savedSubscription.planType,
        expiryDate: savedSubscription.expiryDate,
        features: savedSubscription.features,
        limits: savedSubscription.limits,
      },
      token,
    });
  } catch (error) {
    console.error("Error in registerStore:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Enhanced login with role-based authentication
export const login = async (req, res) => {
  const { email, password, deviceInfo } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user and populate store information
    const user = await User.findOne({ email }).populate({
      path: "storeId",
      populate: {
        path: "subscription.subscriptionId",
        model: "Subscription",
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked due to multiple failed login attempts",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check store subscription status
    if (user.storeId && user.storeId.subscriptionStatus === "expired") {
      return res.status(402).json({
        success: false,
        message: "Store subscription has expired. Please renew to continue",
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login and device info
    user.lastLogin = new Date();
    user.deviceInfo = deviceInfo;
    await user.save();

    // Generate token
    const token = generateToken(user._id, res);

    // Prepare response data
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      storeId: user.storeId?._id,
      branch: user.branch,
      permissions: user.getAccessibleFeatures(),
      lastLogin: user.lastLogin,
      profileImage: user.profileImage,
      preferences: user.preferences,
    };

    const storeResponse = user.storeId ? {
      _id: user.storeId._id,
      storeId: user.storeId.storeId,
      storeName: user.storeId.storeName,
      subscriptionStatus: user.storeId.subscriptionStatus,
      features: user.storeId.features,
      limits: user.storeId.limits,
      branding: user.storeId.branding,
    } : null;

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
      store: storeResponse,
      token,
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create staff user
export const createStaffUser = async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    role,
    permissions,
    branch,
  } = req.body;

  try {
    // Check if current user has permission to create users
    if (!req.user.hasPermission("manage_users")) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create users",
      });
    }

    // Validate required fields
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Validate role
    const validRoles = ["store_admin", "billing_staff", "inventory_staff"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phone,
      role,
      storeId: req.user.storeId,
      branch: branch || req.user.branch,
      permissions: permissions || [],
      isActive: true,
      isVerified: true,
      createdBy: req.user._id,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: "Staff user created successfully",
      user: {
        _id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        permissions: savedUser.getAccessibleFeatures(),
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in createStaffUser:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Enhanced profile update
export const updateProfile = async (req, res) => {
  const {
    fullName,
    phone,
    profileImage,
    address,
    preferences,
  } = req.body;

  try {
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    // Handle profile image upload
    if (profileImage) {
      const uploadResponse = await cloudinary.uploader.upload(profileImage, {
        folder: "pos_system/profiles",
      });
      updateData.profileImage = uploadResponse.secure_url;
    }

    updateData.updatedBy = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.updatedBy = req.user._id;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("storeId")
      .select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Check subscription status
    if (user.storeId && user.storeId.subscriptionStatus === "expired") {
      return res.status(402).json({
        success: false,
        message: "Store subscription has expired",
      });
    }

    // Generate new token
    const token = generateToken(user._id, res);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.getAccessibleFeatures(),
      },
      token,
    });
  } catch (error) {
    console.error("Error in refreshToken:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Enhanced logout with session cleanup
export const logout = async (req, res) => {
  try {
    // Clear session token
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        sessionToken: null,
      });
    }

    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Check authentication status
export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("storeId")
      .select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        permissions: user.getAccessibleFeatures(),
        lastLogin: user.lastLogin,
      },
      store: user.storeId ? {
        _id: user.storeId._id,
        storeName: user.storeId.storeName,
        subscriptionStatus: user.storeId.subscriptionStatus,
      } : null,
    });
  } catch (error) {
    console.error("Error in checkAuth:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // In a real implementation, you would:
    // 1. Generate a reset token
    // 2. Save it to the database with expiry
    // 3. Send email with reset link
    
    // For now, we'll just return a success message
    res.status(200).json({
      success: true,
      message: "Password reset instructions have been sent to your email",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper function to get subscription features based on plan type
function getSubscriptionFeatures(planType) {
  const features = {
    basic: {
      barcodeScanning: true,
      inventoryManagement: true,
      multiStore: false,
      analytics: true,
      whatsappIntegration: true,
      customerManagement: true,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      dataExport: true,
      backupService: false,
    },
    premium: {
      barcodeScanning: true,
      inventoryManagement: true,
      multiStore: true,
      analytics: true,
      whatsappIntegration: true,
      customerManagement: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: false,
      dataExport: true,
      backupService: true,
    },
    enterprise: {
      barcodeScanning: true,
      inventoryManagement: true,
      multiStore: true,
      analytics: true,
      whatsappIntegration: true,
      customerManagement: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
      dataExport: true,
      backupService: true,
    },
  };

  return features[planType] || features.basic;
}

// Helper function to get subscription limits based on plan type
function getSubscriptionLimits(planType) {
  const limits = {
    basic: {
      maxProducts: 1000,
      maxTransactions: 10000,
      maxUsers: 5,
      maxStores: 1,
      maxStorage: 1024, // 1GB
      apiCallsPerMonth: 1000,
    },
    premium: {
      maxProducts: 5000,
      maxTransactions: 50000,
      maxUsers: 15,
      maxStores: 3,
      maxStorage: 5120, // 5GB
      apiCallsPerMonth: 10000,
    },
    enterprise: {
      maxProducts: 25000,
      maxTransactions: 250000,
      maxUsers: 50,
      maxStores: 10,
      maxStorage: 20480, // 20GB
      apiCallsPerMonth: 100000,
    },
  };

  return limits[planType] || limits.basic;
}
