import Subscription from "../models/subscription.model.js";
import Store from "../models/store.model.js";
import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";
import Product from "../models/product.model.js";

// Get subscription status
export const getSubscriptionStatus = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const subscription = await Subscription.findOne({ storeId })
      .populate("storeId", "storeName storeId")
      .populate("createdBy", "fullName email");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get usage statistics
    const [userCount, productCount, transactionCount] = await Promise.all([
      User.countDocuments({ storeId }),
      Product.countDocuments({ storeId }),
      Transaction.countDocuments({ 
        storeId,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    const usage = {
      users: {
        current: userCount,
        limit: subscription.limits.maxUsers,
        percentage: (userCount / subscription.limits.maxUsers) * 100,
      },
      products: {
        current: productCount,
        limit: subscription.limits.maxProducts,
        percentage: (productCount / subscription.limits.maxProducts) * 100,
      },
      transactions: {
        current: transactionCount,
        limit: subscription.limits.maxTransactions,
        percentage: (transactionCount / subscription.limits.maxTransactions) * 100,
      },
    };

    res.status(200).json({
      success: true,
      subscription: {
        ...subscription.toObject(),
        daysUntilExpiry: subscription.daysUntilExpiry,
        subscriptionStatus: subscription.subscriptionStatus,
      },
      usage,
    });
  } catch (error) {
    console.error("Error in getSubscriptionStatus:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all subscriptions (Super Admin only)
export const getAllSubscriptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      planType,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = {};

    if (planType && planType !== "all") {
      filter.planType = planType;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      // Search by store name (requires lookup)
      const stores = await Store.find({
        storeName: { $regex: search, $options: "i" },
      }).select("_id");
      
      if (stores.length > 0) {
        filter.storeId = { $in: stores.map(s => s._id) };
      } else {
        // No matching stores found
        return res.status(200).json({
          success: true,
          subscriptions: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        });
      }
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const subscriptions = await Subscription.find(filter)
      .populate("storeId", "storeName storeId contact")
      .populate("createdBy", "fullName email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(filter);

    // Add computed fields
    const enrichedSubscriptions = subscriptions.map(sub => ({
      ...sub.toObject(),
      daysUntilExpiry: sub.daysUntilExpiry,
      subscriptionStatus: sub.subscriptionStatus,
    }));

    res.status(200).json({
      success: true,
      subscriptions: enrichedSubscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllSubscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Renew subscription
export const renewSubscription = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { 
      renewalPeriod, 
      paymentMethod, 
      paymentReference, 
      amount 
    } = req.body;

    // Check if user can access this store (or is super admin)
    if (req.user.role !== "super_admin" && !req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const subscription = await Subscription.findOne({ storeId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Validate payment information
    if (!paymentMethod || !paymentReference || !amount) {
      return res.status(400).json({
        success: false,
        message: "Payment information is required",
      });
    }

    // Add payment record
    await subscription.addPayment({
      amount,
      paymentMethod,
      referenceId: paymentReference,
      status: "completed",
    });

    // Renew subscription
    await subscription.renewSubscription(renewalPeriod);

    // Update store subscription status
    const store = await Store.findById(storeId);
    store.subscription.expiryDate = subscription.expiryDate;
    store.subscription.isActive = true;
    await store.save();

    res.status(200).json({
      success: true,
      message: "Subscription renewed successfully",
      subscription: {
        expiryDate: subscription.expiryDate,
        status: subscription.status,
        daysUntilExpiry: subscription.daysUntilExpiry,
      },
    });
  } catch (error) {
    console.error("Error in renewSubscription:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Upgrade/downgrade subscription plan
export const changePlan = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { 
      newPlanType, 
      paymentMethod, 
      paymentReference, 
      amount 
    } = req.body;

    // Check if user can access this store (or is super admin)
    if (req.user.role !== "super_admin" && !req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const subscription = await Subscription.findOne({ storeId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (!["basic", "premium", "enterprise"].includes(newPlanType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type",
      });
    }

    // Get new plan features and limits
    const newFeatures = getSubscriptionFeatures(newPlanType);
    const newLimits = getSubscriptionLimits(newPlanType);
    const newPrice = getPlanPrice(newPlanType);

    // Validate current usage against new limits
    const [userCount, productCount] = await Promise.all([
      User.countDocuments({ storeId }),
      Product.countDocuments({ storeId }),
    ]);

    if (userCount > newLimits.maxUsers) {
      return res.status(400).json({
        success: false,
        message: `Current user count (${userCount}) exceeds new plan limit (${newLimits.maxUsers})`,
      });
    }

    if (productCount > newLimits.maxProducts) {
      return res.status(400).json({
        success: false,
        message: `Current product count (${productCount}) exceeds new plan limit (${newLimits.maxProducts})`,
      });
    }

    // Add payment record if amount provided
    if (amount && paymentMethod && paymentReference) {
      await subscription.addPayment({
        amount,
        paymentMethod,
        referenceId: paymentReference,
        status: "completed",
      });
    }

    // Update subscription
    subscription.planType = newPlanType;
    subscription.planName = `${newPlanType.charAt(0).toUpperCase() + newPlanType.slice(1)} Plan`;
    subscription.basePrice = newPrice;
    subscription.finalPrice = newPrice;
    subscription.features = newFeatures;
    subscription.limits = newLimits;
    await subscription.save();

    // Update store features and limits
    const store = await Store.findById(storeId);
    store.subscription.planType = newPlanType;
    store.features = newFeatures;
    store.limits = newLimits;
    await store.save();

    res.status(200).json({
      success: true,
      message: `Plan changed to ${newPlanType} successfully`,
      subscription: {
        planType: subscription.planType,
        features: subscription.features,
        limits: subscription.limits,
      },
    });
  } catch (error) {
    console.error("Error in changePlan:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { reason } = req.body;

    // Check if user can access this store (or is super admin)
    if (req.user.role !== "super_admin" && !req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const subscription = await Subscription.findOne({ storeId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Subscription is already cancelled",
      });
    }

    // Cancel subscription
    await subscription.cancelSubscription(reason, req.user._id);

    // Update store status
    const store = await Store.findById(storeId);
    store.subscription.isActive = false;
    store.isActive = false; // Deactivate store
    await store.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription: {
        status: subscription.status,
        cancellationDate: subscription.cancellationDate,
        cancellationReason: subscription.cancellationReason,
      },
    });
  } catch (error) {
    console.error("Error in cancelSubscription:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get subscription analytics (Super Admin only)
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const analytics = await Subscription.getSubscriptionAnalytics();
    
    // Get expiring subscriptions
    const expiringSubscriptions = await Subscription.getExpiringSubscriptions(30); // Next 30 days

    // Get revenue analytics for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const revenueAnalytics = await Subscription.getRevenueAnalytics(
      twelveMonthsAgo,
      new Date()
    );

    // Calculate total metrics
    const totalMetrics = await Subscription.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $reduce: {
                input: "$paymentHistory",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $eq: ["$$this.status", "completed"] },
                        "$$this.amount",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
          averageRevenue: {
            $avg: {
              $reduce: {
                input: "$paymentHistory",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $eq: ["$$this.status", "completed"] },
                        "$$this.amount",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        planBreakdown: analytics,
        expiringSubscriptions: {
          count: expiringSubscriptions.length,
          subscriptions: expiringSubscriptions,
        },
        revenueAnalytics,
        totalMetrics: totalMetrics[0] || {
          totalRevenue: 0,
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          averageRevenue: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in getSubscriptionAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if user can access this store (or is super admin)
    if (req.user.role !== "super_admin" && !req.user.canAccessStore(storeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this store",
      });
    }

    const subscription = await Subscription.findOne({ storeId })
      .populate("storeId", "storeName");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Sort payments by date (newest first)
    const payments = subscription.paymentHistory.sort(
      (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)
    );

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedPayments = payments.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      payments: paginatedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: payments.length,
        pages: Math.ceil(payments.length / limit),
      },
      store: subscription.storeId,
    });
  } catch (error) {
    console.error("Error in getPaymentHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get available features for current plan
export const getAvailableFeatures = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const subscription = await Subscription.findOne({ storeId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Get all plan features for comparison
    const allPlans = {
      basic: {
        features: getSubscriptionFeatures("basic"),
        limits: getSubscriptionLimits("basic"),
        price: getPlanPrice("basic"),
      },
      premium: {
        features: getSubscriptionFeatures("premium"),
        limits: getSubscriptionLimits("premium"),
        price: getPlanPrice("premium"),
      },
      enterprise: {
        features: getSubscriptionFeatures("enterprise"),
        limits: getSubscriptionLimits("enterprise"),
        price: getPlanPrice("enterprise"),
      },
    };

    res.status(200).json({
      success: true,
      currentPlan: {
        type: subscription.planType,
        features: subscription.features,
        limits: subscription.limits,
        price: subscription.finalPrice,
      },
      availablePlans: allPlans,
    });
  } catch (error) {
    console.error("Error in getAvailableFeatures:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Send renewal reminders (Cron job endpoint)
export const sendRenewalReminders = async (req, res) => {
  try {
    const expiringSubscriptions = await Subscription.getExpiringSubscriptions(30);
    
    const remindersSent = [];
    
    for (const subscription of expiringSubscriptions) {
      const daysUntilExpiry = subscription.daysUntilExpiry;
      let reminderType = null;
      
      if (daysUntilExpiry <= 1) {
        reminderType = "1_day";
      } else if (daysUntilExpiry <= 7) {
        reminderType = "7_days";
      } else if (daysUntilExpiry <= 15) {
        reminderType = "15_days";
      } else if (daysUntilExpiry <= 30) {
        reminderType = "30_days";
      }
      
      if (reminderType) {
        // Check if reminder already sent
        const existingReminder = subscription.renewalReminders.find(
          r => r.reminderType === reminderType && r.sent
        );
        
        if (!existingReminder) {
          // Add reminder record
          await subscription.addRenewalReminder(reminderType, daysUntilExpiry);
          
          // In a real implementation, you would send email/WhatsApp here
          console.log(`Renewal reminder sent for store: ${subscription.storeId.storeName}`);
          
          remindersSent.push({
            storeId: subscription.storeId._id,
            storeName: subscription.storeId.storeName,
            reminderType,
            daysUntilExpiry,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `${remindersSent.length} renewal reminders sent`,
      reminders: remindersSent,
    });
  } catch (error) {
    console.error("Error in sendRenewalReminders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper functions (same as in auth controller)
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

function getPlanPrice(planType) {
  const prices = {
    basic: 5000,    // ₹5,000 for 6 months
    premium: 10000, // ₹10,000 for 6 months
    enterprise: 20000, // ₹20,000 for 6 months
  };

  return prices[planType] || prices.basic;
}
