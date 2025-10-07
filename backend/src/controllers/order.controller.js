import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import BillImageService from "../lib/billImageGenerator.js";
import { uploadBillImage } from "../lib/cloudinary.js";
import WhatsAppService from "../lib/whatsapp.js";
import { whatsappProxy } from "../lib/whatsappProxy.js";

// Get all orders with filtering, searching, and pagination
export const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Role-based filtering: if user is not admin, only show orders created by them
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }
    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.whatsapp": { $regex: search, $options: "i" } },
        { "customer.address": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Different population based on role
    let populateFields = "items.productId";
    let selectFields = "name category image";

    if (req.user.role === "admin") {
      // For admin, also populate user details
      populateFields = [{ path: "items.productId" }, { path: "createdBy" }];
    }

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate(populateFields);

    const total = await Order.countDocuments(filter);

    // Get status counts for dashboard (filtered by user for non-admin users)
    const statusCountsFilter =
      req.user.role !== "admin" ? { createdBy: req.user._id } : {};
    const statusCounts = await Order.aggregate([
      { $match: statusCountsFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCountsObj = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      statusCountsObj[item._id] = item.count;
    });

    res.status(200).json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      statusCounts: statusCountsObj,
    });
  } catch (error) {
    console.error("Error in getAllOrders: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Build filter based on user role
    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    // Different population based on role
    let populateFields = [
      { path: "items.productId", select: "name category image description" },
    ];

    if (req.user.role === "admin") {
      populateFields.push({
        path: "createdBy",
        select: "fullName email branch",
      });
    }

    const order = await Order.findOne(filter).populate(populateFields);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error in getOrderById: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new order
export const createOrder = async (req, res) => {
  try {
    const {
      customer,
      items,
      discount = 0,
      discountType = "amount",
      priority = "medium",
      deliveryDate,
      notes = "",
    } = req.body;

    // Validate required fields
    if (
      !customer ||
      !customer.name ||
      !customer.whatsapp ||
      !customer.address
    ) {
      return res.status(400).json({
        error: "Customer information (name, whatsapp, address) is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "At least one item is required",
      });
    }

    // Validate and process items
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      // Validate item fields
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          error: "Each item must have a valid productId and quantity",
        });
      }

      // Verify product exists
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          error: `Product with ID ${item.productId} not found`,
        });
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: item.quantity,
        subtotal: subtotal,
        isVegetarian: product.isVegetarian,
      });
    }

    // Calculate discount AFTER the loop
    const discountAmount =
      discountType === "percentage"
        ? (totalAmount * parseFloat(discount)) / 100
        : parseFloat(discount) || 0;

    const finalAmount = Math.max(0, totalAmount - discountAmount);

    const orderCount = (await Order.countDocuments()) + 1;
    const orderNumber = `ORD-${orderCount.toString().padStart(3, "0")}`;

    const newOrder = new Order({
      orderNumber,
      customer,
      items: processedItems,
      totalAmount,
      discount: parseFloat(discount) || 0,
      discountType,
      finalAmount,
      priority,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      notes,
      // Add user details and branch
      createdBy: req.user._id,
      branch: req.user.branch,
    });

    const savedOrder = await newOrder.save();

    // Populate the response based on user role
    let populateFields = "items.productId";
    if (req.user.role === "admin") {
      populateFields = [
        { path: "items.productId" },
        { path: "createdBy", select: "fullName email branch" },
      ];
    }

    const populatedOrder = await Order.findById(savedOrder._id).populate(
      populateFields
    );

    res.status(201).json({
      message: "Order created successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Error in createOrder: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update order
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer,
      items,
      discount,
      discountType,
      priority,
      deliveryDate,
      notes,
      status,
    } = req.body;

    // Build filter based on user role
    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Don't allow updating cancelled orders
    if (order.status === "cancelled") {
      return res.status(400).json({
        error: "Cannot update cancelled orders",
      });
    }

    let processedItems = order.items;
    let totalAmount = order.totalAmount;

    // If items are being updated, reprocess them
    if (items && Array.isArray(items)) {
      processedItems = [];
      totalAmount = 0;

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            error: "Each item must have a valid productId and quantity",
          });
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({
            error: `Product with ID ${item.productId} not found`,
          });
        }

        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          productId: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          quantity: item.quantity,
          subtotal: subtotal,
          isVegetarian: product.isVegetarian,
        });
      }
    }

    const discountAmount =
      discount !== undefined ? parseFloat(discount) : order.discount;
    const discType = discountType || order.discountType;
    const calculatedDiscount =
      discType === "percentage"
        ? (totalAmount * discountAmount) / 100
        : discountAmount;
    const finalAmount = Math.max(0, totalAmount - calculatedDiscount);

    const updateData = {
      customer: customer || order.customer,
      items: processedItems,
      totalAmount,
      discount: discount !== undefined ? parseFloat(discount) : order.discount,
      discountType: discountType || order.discountType,
      finalAmount,
      priority: priority || order.priority,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : order.deliveryDate,
      notes: notes !== undefined ? notes : order.notes,
      status: status || order.status,
    };

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate(
      req.user.role === "admin"
        ? [
            { path: "items.productId", select: "name category image" },
            { path: "createdBy", select: "fullName email branch" },
          ]
        : { path: "items.productId", select: "name category image" }
    );

    res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error in updateOrder: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update order status only
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      ![
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ].includes(status)
    ) {
      return res.status(400).json({
        error:
          "Valid status is required (pending, confirmed, preparing, ready, delivered, cancelled)",
      });
    }

    // Build filter based on user role
    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Don't allow changing status of cancelled orders
    if (order.status === "cancelled" && status !== "cancelled") {
      return res.status(400).json({
        error: "Cannot change status of cancelled orders",
      });
    }

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findById(id).populate(
      req.user.role === "admin"
        ? [
            { path: "items.productId", select: "name category image" },
            { path: "createdBy", select: "fullName email branch" },
          ]
        : { path: "items.productId", select: "name category image" }
    );

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error in updateOrderStatus: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Confirm order (special endpoint for confirmation)
export const confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Build filter based on user role
    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        error: "Cannot confirm cancelled order",
      });
    }

    if (order.status === "confirmed") {
      return res.status(400).json({
        error: "Order is already confirmed",
      });
    }

    order.status = "confirmed";
    await order.save();

    const updatedOrder = await Order.findById(id).populate(
      req.user.role === "admin"
        ? [
            { path: "items.productId", select: "name category image" },
            { path: "createdBy", select: "fullName email branch" },
          ]
        : { path: "items.productId", select: "name category image" }
    );

    res.status(200).json({
      message: "Order confirmed successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error in confirmOrder: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Build filter based on user role
    const filter = { _id: id };
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    const deletedOrder = await Order.findOneAndDelete(filter);

    if (!deletedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("Error in deleteOrder: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    let matchStage = {};
    const now = new Date();

    // Role-based filtering: if user is not admin, only show stats for their orders
    if (req.user.role !== "admin") {
      matchStage.createdBy = req.user._id;
    }

    // Set date range based on period
    switch (period) {
      case "today":
        matchStage.createdAt = {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lt: new Date(now.setHours(23, 59, 59, 999)),
        };
        break;
      case "week":
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        matchStage.createdAt = {
          $gte: weekStart,
          $lt: new Date(),
        };
        break;
      case "month":
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
        break;
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$finalAmount" },
          averageOrderValue: { $avg: "$finalAmount" },
          statusBreakdown: {
            $push: {
              status: "$status",
              amount: "$finalAmount",
            },
          },
        },
      },
    ]);

    const statusStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$finalAmount" },
        },
      },
    ]);

    res.status(200).json({
      period,
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      statusStats,
    });
  } catch (error) {
    console.error("Error in getOrderStats: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get orders by date range
// Updated getOrdersByDateRange controller - Fixed date handling
export const getOrdersByDateRange = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      priority,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Start date and end date are required",
      });
    }

    // Build filter object
    const filter = {
      createdAt: {
        $gte: new Date(startDate + "T00:00:00.000Z"), // Start of day
        $lte: new Date(endDate + "T23:59:59.999Z"), // End of day
      },
    };

    // Role-based filtering: if user is not admin, only show orders created by them
    if (req.user.role !== "admin") {
      filter.createdBy = req.user._id;
    }

    // Apply additional filters
    if (status && status !== "all") {
      filter.status = status;
    }
    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.whatsapp": { $regex: search, $options: "i" } },
        { "customer.address": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Different population based on role
    let populateFields = "items.productId";
    if (req.user.role === "admin") {
      populateFields = [
        { path: "items.productId", select: "name category image" },
        { path: "createdBy", select: "fullName email branch" },
      ];
    } else {
      populateFields = {
        path: "items.productId",
        select: "name category image",
      };
    }

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate(populateFields);

    const total = await Order.countDocuments(filter);

    // Get summary statistics for the date range
    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$finalAmount" },
          averageOrderValue: { $avg: "$finalAmount" },
        },
      },
    ]);

    // Get status breakdown for the date range
    const statusBreakdown = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$finalAmount" },
        },
      },
    ]);

    res.status(200).json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      dateRange: {
        startDate,
        endDate,
      },
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      statusBreakdown,
      filters: {
        status,
        priority,
        search,
      },
    });
  } catch (error) {
    console.error("Error in getOrdersByDateRange: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send bill via WhatsApp
// Send bill via WhatsApp - Updated to use direct upload
// Updated sendBillViaWhatsApp function with improved error handling
// Updated sendBillViaWhatsApp controller function
// Fixed controller method - Use direct WhatsApp upload instead of Cloudinary
// controllers/order.controller.js - FIXED sendBillViaWhatsApp and getBillPDF

// Updated order.controller.js - Receive image from frontend
export const sendBillViaWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageData } = req.body;

    // Validate required fields
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: "Bill image data is required",
      });
    }

    // Get order details from database
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Validate customer has WhatsApp number
    if (!order.customer?.whatsapp) {
      return res.status(400).json({
        success: false,
        error: "Customer WhatsApp number not found",
      });
    }

    console.log(
      `📤 Sending bill for Order #${order.orderNumber} to ${order.customer.whatsapp}`
    );

    // Clean base64 data (remove data URL prefix if present)
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // Prepare WhatsApp message caption
    const caption = `📄 *Your Order Bill*
Order #: ${order.orderNumber}
Total Amount: £${order.finalAmount.toFixed(2)}
Status: ${order.status.toUpperCase()}

Thank you for choosing POS! 🍽️

For any queries, please contact us.`;

    // Send bill image via WhatsApp
    const whatsappResponse = await whatsappProxy.sendImageFile(
      order.customer.whatsapp,
      base64Data,
      `bill-${order.orderNumber}.png`,
      "image/png",
      caption
    );

    console.log(`✅ Bill sent successfully to ${order.customer.whatsapp}`);

    // Respond with success
    res.json({
      success: true,
      message: "Bill sent successfully via WhatsApp",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        sentTo: order.customer.whatsapp,
        customerName: order.customer.name,
        whatsappMessageId: whatsappResponse.messageId || whatsappResponse.id,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending bill via WhatsApp:", error);

    // Handle different types of errors
    let errorMessage = "Failed to send bill via WhatsApp";
    let statusCode = 500;

    if (error.message.includes("WhatsApp")) {
      errorMessage = "WhatsApp service error: " + error.message;
      statusCode = 503;
    } else if (error.message.includes("not found")) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Helper function to ensure order exists before sending bill
export const ensureOrderExists = async (
  orderId,
  maxRetries = 3,
  delay = 1000
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Attempt ${attempt}: Looking for order ${orderId}`);

      const order = await Order.findById(orderId).populate([
        {
          path: "items.productId",
          select: "name category image description items",
        },
        { path: "createdBy", select: "fullName email branch" },
      ]);

      if (order) {
        console.log(
          `✅ Order found on attempt ${attempt}: ${order.orderNumber}`
        );
        return order;
      }

      console.log(
        `❌ Order not found on attempt ${attempt}, retrying in ${delay}ms...`
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Order not found after ${maxRetries} attempts`);
};

// Auto-send bill function for new orders
export const autoSendBillForNewOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🤖 Auto-sending bill for new order: ${orderId}`);

    // Ensure order exists with retries
    const order = await ensureOrderExists(orderId, 5, 2000); // 5 attempts, 2 seconds apart

    if (!order.customer.whatsapp) {
      console.log("❌ No WhatsApp number for auto-send");
      return res.status(400).json({
        success: false,
        error: "Customer WhatsApp number is required for auto-send",
      });
    }

    // Generate bill HTML and convert to image would happen on frontend
    // For auto-send, we'll trigger the frontend to handle it
    res.status(200).json({
      success: true,
      message: "Order ready for auto-bill sending",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerWhatsapp: order.customer.whatsapp,
      },
    });
  } catch (error) {
    console.error("❌ Error in auto-send bill:", error);
    res.status(500).json({
      success: false,
      error: "Failed to prepare auto-send",
      details: error.message,
    });
  }
};
