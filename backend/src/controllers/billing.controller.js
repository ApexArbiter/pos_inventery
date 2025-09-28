import Transaction from "../models/transaction.model.js";
import Product from "../models/product.model.js";
import Inventory from "../models/inventory.model.js";
import Customer from "../models/customer.model.js";
import { whatsappProxy } from "../lib/whatsappProxy.js";

// Create new transaction/bill
export const createTransaction = async (req, res) => {
  try {
    const {
      customerInfo,
      customerId,
      items,
      payments,
      paymentMethod,
      notes,
      discounts,
    } = req.body;

    const storeId = req.user.storeId;
    const cashierId = req.user._id;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Process and validate items
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { productId, barcode, quantity, discount = 0, discountType = "amount" } = item;

      if (!productId && !barcode) {
        return res.status(400).json({
          success: false,
          message: "Product ID or barcode is required for each item",
        });
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid quantity is required for each item",
        });
      }

      // Find product
      let product;
      if (productId) {
        product = await Product.findOne({ _id: productId, storeId, isActive: true });
      } else {
        product = await Product.findOne({ barcode, storeId, isActive: true });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${productId || barcode}`,
        });
      }

      // Check inventory availability
      const inventory = await Inventory.findOne({ productId: product._id, storeId });
      if (inventory && inventory.availableStock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}. Available: ${inventory.availableStock}`,
        });
      }

      // Calculate item pricing
      const itemSubtotal = product.sellingPrice * quantity;
      const itemDiscount = discountType === "percentage" 
        ? (itemSubtotal * discount) / 100 
        : discount;
      const itemAfterDiscount = itemSubtotal - itemDiscount;
      const itemGstAmount = (itemAfterDiscount * product.gstRate) / 100;
      const itemTotal = itemAfterDiscount + itemGstAmount;

      processedItems.push({
        productId: product._id,
        barcode: product.barcode,
        productName: product.productName,
        category: product.category,
        brand: product.brand,
        quantity,
        unit: product.unit,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        discount: discount || 0,
        discountType,
        discountAmount: itemDiscount,
        gstRate: product.gstRate,
        gstAmount: itemGstAmount,
        totalAmount: itemTotal,
      });

      subtotal += itemSubtotal;
    }

    // Calculate total amounts
    const totalDiscount = processedItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const totalGstAmount = processedItems.reduce((sum, item) => sum + item.gstAmount, 0);
    const finalAmount = subtotal - totalDiscount + totalGstAmount;

    // Process customer information
    let customer = null;
    let processedCustomerInfo = customerInfo;

    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, storeId });
      if (customer) {
        processedCustomerInfo = {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address?.street || "",
        };
      }
    } else if (customerInfo?.phone) {
      // Try to find existing customer by phone
      customer = await Customer.findOne({ 
        phone: customerInfo.phone, 
        storeId 
      });
      
      if (!customer && customerInfo.name) {
        // Create new customer
        customer = new Customer({
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          address: {
            street: customerInfo.address,
          },
          storeId,
          createdBy: req.user._id,
        });
        await customer.save();
      }
    }

    // Create transaction
    const newTransaction = new Transaction({
      storeId,
      customerId: customer?._id,
      customerInfo: processedCustomerInfo,
      items: processedItems,
      subtotal,
      totalDiscount,
      totalGstAmount,
      finalAmount,
      paymentMethod,
      payments: payments || [{
        method: paymentMethod,
        amount: finalAmount,
        status: "completed",
      }],
      cashierId,
      cashierName: req.user.fullName,
      notes: notes || "",
    });

    const savedTransaction = await newTransaction.save();

    // Update inventory for each item
    for (const item of processedItems) {
      const inventory = await Inventory.findOne({ 
        productId: item.productId, 
        storeId 
      });
      
      if (inventory) {
        await inventory.removeStock(
          item.quantity,
          `Sale - Bill #${savedTransaction.billNumber}`,
          req.user._id,
          savedTransaction._id.toString(),
          "sale"
        );
      }
    }

    // Update customer transaction stats
    if (customer) {
      await customer.updateTransactionStats(finalAmount);
      
      // Add loyalty points (1 point per rupee spent)
      await customer.addLoyaltyPoints(Math.floor(finalAmount), "Purchase");
    }

    // Populate the response
    const populatedTransaction = await Transaction.findById(savedTransaction._id)
      .populate("customerId", "name phone email loyaltyTier")
      .populate("cashierId", "fullName");

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction: populatedTransaction,
      billNumber: savedTransaction.billNumber,
    });
  } catch (error) {
    console.error("Error in createTransaction:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const storeId = req.user.storeId;

    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      storeId 
    })
      .populate("customerId", "name phone email loyaltyTier")
      .populate("cashierId", "fullName")
      .populate("items.productId", "productName images");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Error in getTransactionById:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get transaction by bill number
export const getTransactionByBillNumber = async (req, res) => {
  try {
    const { billNumber } = req.params;
    const storeId = req.user.storeId;

    const transaction = await Transaction.findOne({ 
      billNumber, 
      storeId 
    })
      .populate("customerId", "name phone email loyaltyTier")
      .populate("cashierId", "fullName")
      .populate("items.productId", "productName images");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Error in getTransactionByBillNumber:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all transactions with filtering
export const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      paymentMethod,
      status,
      customerId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const storeId = req.user.storeId;
    const filter = { storeId };

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Other filters
    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (customerId) {
      filter.customerId = customerId;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { billNumber: { $regex: search, $options: "i" } },
        { "customerInfo.name": { $regex: search, $options: "i" } },
        { "customerInfo.phone": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const transactions = await Transaction.find(filter)
      .populate("customerId", "name phone email")
      .populate("cashierId", "fullName")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-items"); // Exclude items for list view

    const total = await Transaction.countDocuments(filter);

    // Calculate summary statistics
    const stats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
          averageOrderValue: { $avg: "$finalAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        averageOrderValue: 0,
      },
    });
  } catch (error) {
    console.error("Error in getAllTransactions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Process return/refund
export const processReturn = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { returnItems, reason, refundAmount } = req.body;
    const storeId = req.user.storeId;

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Return items are required",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      });
    }

    // Find original transaction
    const originalTransaction = await Transaction.findOne({ 
      _id: transactionId, 
      storeId 
    });

    if (!originalTransaction) {
      return res.status(404).json({
        success: false,
        message: "Original transaction not found",
      });
    }

    if (originalTransaction.status === "refunded") {
      return res.status(400).json({
        success: false,
        message: "Transaction already refunded",
      });
    }

    // Validate return items
    let totalRefundAmount = 0;
    const processedReturnItems = [];

    for (const returnItem of returnItems) {
      const { productId, quantity } = returnItem;
      
      const originalItem = originalTransaction.items.find(
        item => item.productId.toString() === productId.toString()
      );

      if (!originalItem) {
        return res.status(400).json({
          success: false,
          message: `Product ${productId} not found in original transaction`,
        });
      }

      if (quantity > originalItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity cannot exceed original quantity for ${originalItem.productName}`,
        });
      }

      const itemRefundAmount = (originalItem.totalAmount / originalItem.quantity) * quantity;
      totalRefundAmount += itemRefundAmount;

      processedReturnItems.push({
        ...originalItem,
        quantity,
        totalAmount: itemRefundAmount,
        returnReason: reason,
        returnDate: new Date(),
      });

      // Update inventory (add back returned stock)
      const inventory = await Inventory.findOne({ 
        productId, 
        storeId 
      });
      
      if (inventory) {
        await inventory.addStock(
          quantity,
          `Return - Bill #${originalTransaction.billNumber}`,
          req.user._id,
          originalTransaction._id.toString(),
          "return"
        );
      }
    }

    // Create return transaction
    const returnTransaction = await originalTransaction.createReturn(
      processedReturnItems,
      reason,
      req.user._id
    );

    // Update original transaction
    originalTransaction.status = returnItems.length === originalTransaction.items.length 
      ? "refunded" 
      : "partially_refunded";
    originalTransaction.isReturned = true;
    await originalTransaction.save();

    res.status(200).json({
      success: true,
      message: "Return processed successfully",
      returnTransaction,
      refundAmount: totalRefundAmount,
    });
  } catch (error) {
    console.error("Error in processReturn:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Send bill via WhatsApp
export const sendBillViaWhatsApp = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { imageData } = req.body;
    const storeId = req.user.storeId;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "Bill image data is required",
      });
    }

    // Get transaction details
    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      storeId 
    })
      .populate("customerId", "name phone")
      .populate("items.productId", "productName");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Validate customer has WhatsApp number
    const customerPhone = transaction.customerId?.phone || transaction.customerInfo?.phone;
    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer WhatsApp number not found",
      });
    }

    console.log(`📤 Sending bill for Transaction #${transaction.billNumber} to ${customerPhone}`);

    // Clean base64 data
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // Prepare WhatsApp message caption
    const caption = `📄 *Your Purchase Bill*
Bill #: ${transaction.billNumber}
Total Amount: ${transaction.finalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
Date: ${new Date(transaction.createdAt).toLocaleDateString()}

Thank you for shopping with us! 🛒

For any queries, please contact us.`;

    // Send bill image via WhatsApp
    const whatsappResponse = await whatsappProxy.sendImageFile(
      customerPhone,
      base64Data,
      `bill-${transaction.billNumber}.png`,
      "image/png",
      caption
    );

    // Update transaction with WhatsApp details
    await transaction.markWhatsAppSent(whatsappResponse.messageId || whatsappResponse.id);

    console.log(`✅ Bill sent successfully to ${customerPhone}`);

    res.status(200).json({
      success: true,
      message: "Bill sent successfully via WhatsApp",
      data: {
        transactionId: transaction._id,
        billNumber: transaction.billNumber,
        sentTo: customerPhone,
        customerName: transaction.customerId?.name || transaction.customerInfo?.name,
        whatsappMessageId: whatsappResponse.messageId || whatsappResponse.id,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending bill via WhatsApp:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send bill via WhatsApp",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get sales reports
export const getSalesReports = async (req, res) => {
  try {
    const {
      reportType = "daily",
      startDate,
      endDate,
      groupBy = "day",
    } = req.query;
    const storeId = req.user.storeId;

    let matchStage = { storeId, status: "completed" };
    
    // Set date range
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage.createdAt = { $gte: thirtyDaysAgo };
    }

    // Group by configuration
    let groupByStage = {};
    switch (groupBy) {
      case "hour":
        groupByStage = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          hour: { $hour: "$createdAt" },
        };
        break;
      case "day":
        groupByStage = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
        break;
      case "month":
        groupByStage = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
        break;
      case "year":
        groupByStage = {
          year: { $year: "$createdAt" },
        };
        break;
    }

    const salesData = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupByStage,
          totalSales: { $sum: "$finalAmount" },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: "$finalAmount" },
          totalItems: { $sum: { $sum: "$items.quantity" } },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 },
      },
    ]);

    // Payment method breakdown
    const paymentMethodData = await Transaction.aggregate([
      { $match: matchStage },
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

    // Top selling products
    const topProducts = await Transaction.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: { $sum: "$items.totalAmount" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      reportType,
      period: { startDate, endDate },
      salesData,
      paymentMethodBreakdown: paymentMethodData,
      topSellingProducts: topProducts,
    });
  } catch (error) {
    console.error("Error in getSalesReports:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get POS dashboard data
export const getPosDashboard = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Today's transactions
    const todayStats = await Transaction.aggregate([
      {
        $match: {
          storeId,
          createdAt: { $gte: startOfDay },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$finalAmount" },
          totalTransactions: { $sum: 1 },
          totalItems: { $sum: { $sum: "$items.quantity" } },
          averageOrderValue: { $avg: "$finalAmount" },
        },
      },
    ]);

    // Recent transactions
    const recentTransactions = await Transaction.find({ storeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customerId", "name phone")
      .select("billNumber finalAmount createdAt customerInfo paymentMethod");

    // Low stock alerts
    const lowStockItems = await Inventory.find({
      storeId,
      $expr: { $lte: ["$currentStock", "$reorderPoint"] },
    })
      .populate("productId", "productName barcode")
      .limit(5);

    // Quick stats
    const quickStats = {
      todaySales: todayStats[0]?.totalSales || 0,
      todayTransactions: todayStats[0]?.totalTransactions || 0,
      todayItems: todayStats[0]?.totalItems || 0,
      averageOrderValue: todayStats[0]?.averageOrderValue || 0,
      lowStockAlerts: lowStockItems.length,
    };

    res.status(200).json({
      success: true,
      dashboard: {
        quickStats,
        recentTransactions,
        lowStockItems,
      },
    });
  } catch (error) {
    console.error("Error in getPosDashboard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
