import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Store from "../models/store.model.js";

// Enhanced authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate("storeId")
      .select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Role-based authorization middleware
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required`,
      });
    }

    next();
  };
};

// Store access validation middleware
export const requireStoreAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const storeId = req.params.storeId || req.body.storeId || req.query.storeId;
  
  if (storeId && !req.user.canAccessStore(storeId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied to this store",
    });
  }

  next();
};

// Subscription validation middleware
export const validateSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.storeId) {
      return res.status(401).json({
        success: false,
        message: "Store association required",
      });
    }

    const store = await Store.findById(req.user.storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    // Check subscription status
    if (store.subscriptionStatus === "expired") {
      return res.status(402).json({
        success: false,
        message: "Subscription expired. Please renew to continue",
        subscriptionStatus: store.subscriptionStatus,
        expiryDate: store.subscription.expiryDate,
      });
    }

    if (!store.subscription.isActive) {
      return res.status(402).json({
        success: false,
        message: "Subscription is inactive",
      });
    }

    req.store = store;
    next();
  } catch (error) {
    console.error("Subscription validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Subscription validation failed",
    });
  }
};

// Feature access validation middleware
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.storeId) {
        return res.status(401).json({
          success: false,
          message: "Store association required",
        });
      }

      const store = req.store || await Store.findById(req.user.storeId);
      
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      if (!store.hasFeature(featureName)) {
        return res.status(403).json({
          success: false,
          message: `Feature '${featureName}' not available in your subscription plan`,
          currentPlan: store.subscription.planType,
        });
      }

      if (!req.store) req.store = store;
      next();
    } catch (error) {
      console.error("Feature validation error:", error);
      return res.status(500).json({
        success: false,
        message: "Feature validation failed",
      });
    }
  };
};

// Limit validation middleware
export const validateLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.storeId) {
        return res.status(401).json({
          success: false,
          message: "Store association required",
        });
      }

      const store = req.store || await Store.findById(req.user.storeId);
      
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Get current count based on limit type
      let currentCount = 0;
      
      switch (limitType) {
        case "maxProducts":
          const Product = (await import("../models/product.model.js")).default;
          currentCount = await Product.countDocuments({ storeId: store._id });
          break;
          
        case "maxUsers":
          currentCount = await User.countDocuments({ storeId: store._id });
          break;
          
        case "maxTransactions":
          const Transaction = (await import("../models/transaction.model.js")).default;
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          currentCount = await Transaction.countDocuments({
            storeId: store._id,
            createdAt: { $gte: startOfMonth },
          });
          break;
          
        default:
          return next(); // Skip validation for unknown limit types
      }

      if (!store.checkLimit(limitType, currentCount)) {
        return res.status(403).json({
          success: false,
          message: `${limitType} limit exceeded. Current: ${currentCount}, Max: ${store.limits[limitType]}`,
          currentCount,
          maxAllowed: store.limits[limitType],
          limitType,
        });
      }

      if (!req.store) req.store = store;
      next();
    } catch (error) {
      console.error("Limit validation error:", error);
      return res.status(500).json({
        success: false,
        message: "Limit validation failed",
      });
    }
  };
};

// API rate limiting middleware
export const rateLimitByPlan = async (req, res, next) => {
  try {
    if (!req.user || !req.user.storeId) {
      return next();
    }

    const store = req.store || await Store.findById(req.user.storeId);
    
    if (!store) {
      return next();
    }

    // Simple rate limiting based on subscription plan
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    
    // In a production environment, you would use Redis or similar
    // For now, we'll just check against the monthly API limit
    const apiCallsThisMonth = 0; // This would be fetched from cache/database
    
    if (apiCallsThisMonth >= store.limits.apiCallsPerMonth) {
      return res.status(429).json({
        success: false,
        message: "API call limit exceeded for this month",
        limit: store.limits.apiCallsPerMonth,
        used: apiCallsThisMonth,
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    next(); // Continue on error to avoid blocking requests
  }
};

// Super admin only middleware
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }
  next();
};

// Store admin or higher middleware
export const requireStoreAdmin = (req, res, next) => {
  if (!req.user || !["super_admin", "store_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Store admin access required",
    });
  }
  next();
};

// Billing staff access middleware
export const requireBillingAccess = (req, res, next) => {
  const allowedRoles = ["super_admin", "store_admin", "billing_staff"];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Billing access required",
    });
  }
  next();
};

// Inventory staff access middleware
export const requireInventoryAccess = (req, res, next) => {
  const allowedRoles = ["super_admin", "store_admin", "inventory_staff"];
  
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Inventory access required",
    });
  }
  next();
};

// Audit logging middleware
export const auditLog = (action) => {
  return (req, res, next) => {
    // Log the action for audit purposes
    console.log(`Audit: ${req.user?.email || 'Unknown'} performed ${action} at ${new Date()}`);
    
    // In a production environment, you would save this to an audit log database
    // const auditEntry = {
    //   userId: req.user?._id,
    //   storeId: req.user?.storeId,
    //   action,
    //   ipAddress: req.ip,
    //   userAgent: req.get('User-Agent'),
    //   timestamp: new Date(),
    //   details: {
    //     method: req.method,
    //     path: req.path,
    //     params: req.params,
    //     query: req.query,
    //   }
    // };
    
    next();
  };
};
