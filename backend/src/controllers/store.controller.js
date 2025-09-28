import Store from "../models/store.model.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Product from "../models/product.model.js";
import Transaction from "../models/transaction.model.js";
import cloudinary from "../lib/cloudinary.js";

// Get all stores (Super Admin only)
export const getAllStores = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      planType,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    if (search) {
      filter.$or = [
        { storeName: { $regex: search, $options: "i" } },
        { storeId: { $regex: search, $options: "i" } },
        { "contact.email": { $regex: search, $options: "i" } },
        { "contact.phone": { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      if (status === "active") {
        filter.isActive = true;
        filter["subscription.isActive"] = true;
      } else if (status === "expired") {
        filter["subscription.expiryDate"] = { $lt: new Date() };
      } else if (status === "inactive") {
        filter.isActive = false;
      }
    }

    if (planType && planType !== "all") {
      filter["subscription.planType"] = planType;
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const stores = await Store.find(filter)
      .populate("createdBy", "fullName email")
      .populate("subscription.subscriptionId")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Store.countDocuments(filter);

    // Get store statistics
    const stats = await Store.aggregate([
      {
        $group: {
          _id: null,
          totalStores: { $sum: 1 },
          activeStores: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $eq: ["$subscription.isActive", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expiredStores: {
            $sum: {
              $cond: [
                { $lt: ["$subscription.expiryDate", new Date()] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || { totalStores: 0, activeStores: 0, expiredStores: 0 },
    });
  } catch (error) {
    console.error("Error in getAllStores:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get store details
export const getStoreDetails = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId)
      .populate("createdBy", "fullName email")
      .populate("subscription.subscriptionId");

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    // Get store statistics
    const [userCount, productCount, transactionStats] = await Promise.all([
      User.countDocuments({ storeId }),
      Product.countDocuments({ storeId }),
      Transaction.aggregate([
        { $match: { storeId: store._id } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalRevenue: { $sum: "$finalAmount" },
            thisMonthTransactions: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      "$createdAt",
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            thisMonthRevenue: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      "$createdAt",
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    ],
                  },
                  "$finalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const storeStats = {
      users: userCount,
      products: productCount,
      totalTransactions: transactionStats[0]?.totalTransactions || 0,
      totalRevenue: transactionStats[0]?.totalRevenue || 0,
      thisMonthTransactions: transactionStats[0]?.thisMonthTransactions || 0,
      thisMonthRevenue: transactionStats[0]?.thisMonthRevenue || 0,
    };

    res.status(200).json({
      success: true,
      store,
      stats: storeStats,
    });
  } catch (error) {
    console.error("Error in getStoreDetails:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update store information
export const updateStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const {
      storeName,
      address,
      contact,
      business,
      settings,
    } = req.body;

    // Check if user can access this store
    if (!req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const updateData = {};

    if (storeName) updateData.storeName = storeName;
    if (address) updateData.address = { ...updateData.address, ...address };
    if (contact) updateData.contact = { ...updateData.contact, ...contact };
    if (business) updateData.business = { ...updateData.business, ...business };
    if (settings) updateData.settings = { ...updateData.settings, ...settings };

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      updateData,
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Error in updateStore:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update store branding
export const updateStoreBranding = async (req, res) => {
  try {
    const { storeId } = req.params;
    const {
      logo,
      primaryColor,
      secondaryColor,
      billTemplate,
      footerMessage,
    } = req.body;

    // Check if user can access this store
    if (!req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const updateData = { branding: {} };

    // Handle logo upload
    if (logo) {
      const uploadResponse = await cloudinary.uploader.upload(logo, {
        folder: "pos_system/store_logos",
      });
      updateData.branding.logo = uploadResponse.secure_url;
      updateData.storeImage = uploadResponse.secure_url; // Also update main store image
    }

    if (primaryColor) updateData.branding.primaryColor = primaryColor;
    if (secondaryColor) updateData.branding.secondaryColor = secondaryColor;
    if (billTemplate) updateData.branding.billTemplate = billTemplate;
    if (footerMessage) updateData.branding.footerMessage = footerMessage;

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Store branding updated successfully",
      branding: updatedStore.branding,
    });
  } catch (error) {
    console.error("Error in updateStoreBranding:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get store settings
export const getStoreSettings = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Check if user can access this store
    if (!req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const store = await Store.findById(storeId).select("settings features limits");

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      settings: store.settings,
      features: store.features,
      limits: store.limits,
    });
  } catch (error) {
    console.error("Error in getStoreSettings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update store settings
export const updateStoreSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const {
      currency,
      timezone,
      language,
      taxInclusive,
      allowNegativeStock,
      lowStockThreshold,
      receiptPrinter,
    } = req.body;

    // Check if user can access this store
    if (!req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const updateData = { settings: {} };

    if (currency) updateData.settings.currency = currency;
    if (timezone) updateData.settings.timezone = timezone;
    if (language) updateData.settings.language = language;
    if (typeof taxInclusive === "boolean") updateData.settings.taxInclusive = taxInclusive;
    if (typeof allowNegativeStock === "boolean") updateData.settings.allowNegativeStock = allowNegativeStock;
    if (lowStockThreshold !== undefined) updateData.settings.lowStockThreshold = lowStockThreshold;
    if (receiptPrinter) updateData.settings.receiptPrinter = receiptPrinter;

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Store settings updated successfully",
      settings: updatedStore.settings,
    });
  } catch (error) {
    console.error("Error in updateStoreSettings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get store dashboard data
export const getStoreDashboard = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel data fetching
    const [
      todayTransactions,
      monthlyTransactions,
      productCount,
      lowStockProducts,
      userCount,
      recentTransactions,
    ] = await Promise.all([
      // Today's transactions
      Transaction.aggregate([
        {
          $match: {
            storeId,
            createdAt: { $gte: startOfDay, $lt: endOfDay },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: "$finalAmount" },
            averageOrderValue: { $avg: "$finalAmount" },
          },
        },
      ]),

      // Monthly transactions
      Transaction.aggregate([
        {
          $match: {
            storeId,
            createdAt: { $gte: startOfMonth },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: "$finalAmount" },
          },
        },
      ]),

      // Product count
      Product.countDocuments({ storeId, isActive: true }),

      // Low stock products
      Product.aggregate([
        { $match: { storeId, isActive: true } },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "productId",
            as: "inventory",
          },
        },
        {
          $match: {
            $expr: {
              $lte: [
                { $arrayElemAt: ["$inventory.currentStock", 0] },
                "$reorderPoint",
              ],
            },
          },
        },
        { $count: "lowStockCount" },
      ]),

      // Active user count
      User.countDocuments({ storeId, isActive: true }),

      // Recent transactions
      Transaction.find({ storeId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customerId", "name phone")
        .select("billNumber finalAmount createdAt customerInfo"),
    ]);

    const dashboardData = {
      today: {
        transactions: todayTransactions[0]?.count || 0,
        revenue: todayTransactions[0]?.revenue || 0,
        averageOrderValue: todayTransactions[0]?.averageOrderValue || 0,
      },
      monthly: {
        transactions: monthlyTransactions[0]?.count || 0,
        revenue: monthlyTransactions[0]?.revenue || 0,
      },
      inventory: {
        totalProducts: productCount,
        lowStockItems: lowStockProducts[0]?.lowStockCount || 0,
      },
      users: {
        activeUsers: userCount,
      },
      recentTransactions,
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error in getStoreDashboard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get store users
export const getStoreUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      isActive,
    } = req.query;

    const storeId = req.user.storeId;
    const filter = { storeId };

    if (role && role !== "all") {
      filter.role = role;
    }

    if (typeof isActive === "boolean" || isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getStoreUsers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Toggle store active status (Super Admin only)
export const toggleStoreStatus = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { isActive } = req.body;

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { isActive },
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Store ${isActive ? "activated" : "deactivated"} successfully`,
      store: updatedStore,
    });
  } catch (error) {
    console.error("Error in toggleStoreStatus:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete store (Super Admin only)
export const deleteStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Check if store has any transactions
    const transactionCount = await Transaction.countDocuments({ storeId });
    
    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete store with existing transactions",
        transactionCount,
      });
    }

    // Delete related data
    await Promise.all([
      User.deleteMany({ storeId }),
      Product.deleteMany({ storeId }),
      Subscription.deleteMany({ storeId }),
    ]);

    // Delete store
    const deletedStore = await Store.findByIdAndDelete(storeId);

    if (!deletedStore) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Store deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteStore:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
