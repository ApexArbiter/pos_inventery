import Inventory from "../models/inventory.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

// Get inventory overview with filtering
export const getInventoryOverview = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      lowStock,
      outOfStock,
      sortBy = "productName",
      sortOrder = "asc",
    } = req.query;

    const storeId = req.user.storeId;
    
    // Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          storeId,
          "product.isActive": true,
        },
      },
    ];

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "product.productName": { $regex: search, $options: "i" } },
            { "product.barcode": { $regex: search, $options: "i" } },
            { "product.brand": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Add category filter
    if (category && category !== "all") {
      pipeline.push({
        $match: {
          "product.category": mongoose.Types.ObjectId(category),
        },
      });
    }

    // Add stock filters
    if (lowStock === "true") {
      pipeline.push({
        $match: {
          $expr: {
            $and: [
              { $lte: ["$currentStock", "$reorderPoint"] },
              { $gt: ["$currentStock", 0] },
            ],
          },
        },
      });
    }

    if (outOfStock === "true") {
      pipeline.push({
        $match: {
          currentStock: { $lte: 0 },
        },
      });
    }

    // Add category lookup
    pipeline.push({
      $lookup: {
        from: "categories",
        localField: "product.category",
        foreignField: "_id",
        as: "category",
      },
    });

    // Project final fields
    pipeline.push({
      $project: {
        productId: 1,
        currentStock: 1,
        reservedStock: 1,
        availableStock: 1,
        reorderPoint: 1,
        maxStockLevel: 1,
        lastRestocked: 1,
        lastSold: 1,
        averageCost: 1,
        totalValue: 1,
        alerts: 1,
        updatedAt: 1,
        "product.productName": 1,
        "product.barcode": 1,
        "product.brand": 1,
        "product.sellingPrice": 1,
        "product.costPrice": 1,
        "product.unit": 1,
        "product.images": 1,
        categoryName: { $arrayElemAt: ["$category.name", 0] },
        isLowStock: {
          $lte: ["$currentStock", "$reorderPoint"],
        },
        isOutOfStock: {
          $lte: ["$currentStock", 0],
        },
      },
    });

    // Add sorting
    const sortField = sortBy === "productName" ? "product.productName" : sortBy;
    pipeline.push({
      $sort: { [sortField]: sortOrder === "desc" ? -1 : 1 },
    });

    // Get total count
    const totalPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Inventory.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    const inventory = await Inventory.aggregate(pipeline);

    res.status(200).json({
      success: true,
      inventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getInventoryOverview:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get inventory for specific product
export const getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.storeId;

    const inventory = await Inventory.findOne({ productId, storeId })
      .populate({
        path: "productId",
        select: "productName barcode brand sellingPrice costPrice unit images",
      })
      .populate("lastUpdatedBy", "fullName");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    res.status(200).json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error("Error in getProductInventory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Add stock to inventory
export const addStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reason, referenceId, referenceType, notes, costPrice } = req.body;
    const storeId = req.user.storeId;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    // Find inventory record
    let inventory = await Inventory.findOne({ productId, storeId });
    
    if (!inventory) {
      // Create new inventory record if it doesn't exist
      const product = await Product.findOne({ _id: productId, storeId });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      inventory = new Inventory({
        productId,
        storeId,
        currentStock: 0,
        reorderPoint: product.reorderPoint || 10,
        maxStockLevel: product.maxStockLevel || 1000,
        lastUpdatedBy: req.user._id,
      });
    }

    // Add stock using the model method
    await inventory.addStock(
      quantity,
      reason,
      req.user._id,
      referenceId,
      referenceType
    );

    // Update cost if provided
    if (costPrice) {
      const totalCost = inventory.currentStock * inventory.averageCost + quantity * costPrice;
      inventory.averageCost = totalCost / (inventory.currentStock + quantity);
      inventory.lastCost = costPrice;
    }

    // Get updated inventory with product details
    const updatedInventory = await Inventory.findOne({ productId, storeId })
      .populate("productId", "productName barcode brand")
      .populate("lastUpdatedBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Stock added successfully",
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error("Error in addStock:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Remove stock from inventory
export const removeStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reason, referenceId, referenceType, notes } = req.body;
    const storeId = req.user.storeId;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const inventory = await Inventory.findOne({ productId, storeId });
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    // Remove stock using the model method
    await inventory.removeStock(
      quantity,
      reason,
      req.user._id,
      referenceId,
      referenceType
    );

    // Get updated inventory with product details
    const updatedInventory = await Inventory.findOne({ productId, storeId })
      .populate("productId", "productName barcode brand")
      .populate("lastUpdatedBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Stock removed successfully",
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error("Error in removeStock:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Adjust stock levels
export const adjustStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { newQuantity, reason, notes } = req.body;
    const storeId = req.user.storeId;

    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "New quantity must be provided and cannot be negative",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const inventory = await Inventory.findOne({ productId, storeId });
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    // Adjust stock using the model method
    await inventory.adjustStock(newQuantity, reason, req.user._id, notes);

    // Get updated inventory with product details
    const updatedInventory = await Inventory.findOne({ productId, storeId })
      .populate("productId", "productName barcode brand")
      .populate("lastUpdatedBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Stock adjusted successfully",
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error("Error in adjustStock:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get stock movements for a product
export const getStockMovements = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      startDate,
      endDate,
      sortOrder = "desc",
    } = req.query;
    const storeId = req.user.storeId;

    const inventory = await Inventory.findOne({ productId, storeId });
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    let movements = inventory.stockMovements;

    // Apply filters
    if (type && type !== "all") {
      movements = movements.filter(movement => movement.type === type);
    }

    if (startDate) {
      movements = movements.filter(movement => 
        movement.timestamp >= new Date(startDate)
      );
    }

    if (endDate) {
      movements = movements.filter(movement => 
        movement.timestamp <= new Date(endDate)
      );
    }

    // Sort movements
    movements.sort((a, b) => {
      return sortOrder === "desc" 
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp);
    });

    // Pagination
    const total = movements.length;
    const skip = (page - 1) * limit;
    const paginatedMovements = movements.slice(skip, skip + parseInt(limit));

    // Populate user information for each movement
    const userIds = [...new Set(paginatedMovements.map(m => m.performedBy))];
    const users = await User.find({ _id: { $in: userIds } })
      .select("fullName email");
    
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    const movementsWithUsers = paginatedMovements.map(movement => ({
      ...movement.toObject(),
      performedBy: userMap[movement.performedBy.toString()] || movement.performedBy,
    }));

    res.status(200).json({
      success: true,
      movements: movementsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getStockMovements:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const lowStockItems = await Inventory.getLowStockItems(storeId);

    // Group alerts by type
    const alerts = {
      lowStock: lowStockItems.filter(item => 
        item.alerts.lowStock.isActive && item.currentStock > 0
      ),
      outOfStock: lowStockItems.filter(item => 
        item.alerts.outOfStock.isActive
      ),
      expiring: lowStockItems.filter(item => 
        item.alerts.expiry.isActive
      ),
    };

    res.status(200).json({
      success: true,
      alerts,
      summary: {
        lowStockCount: alerts.lowStock.length,
        outOfStockCount: alerts.outOfStock.length,
        expiringCount: alerts.expiring.length,
        totalAlerts: alerts.lowStock.length + alerts.outOfStock.length + alerts.expiring.length,
      },
    });
  } catch (error) {
    console.error("Error in getLowStockAlerts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get inventory summary/dashboard
export const getInventorySummary = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const [summary, lowStockItems] = await Promise.all([
      Inventory.getInventorySummary(storeId),
      Inventory.getLowStockItems(storeId),
    ]);

    // Calculate additional metrics
    const inventoryMetrics = await Inventory.aggregate([
      { $match: { storeId } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          "product.isActive": true,
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockValue: { $sum: "$totalValue" },
          totalCurrentStock: { $sum: "$currentStock" },
          averageStockLevel: { $avg: "$currentStock" },
          lowStockItems: {
            $sum: {
              $cond: [
                { $lte: ["$currentStock", "$reorderPoint"] },
                1,
                0,
              ],
            },
          },
          outOfStockItems: {
            $sum: {
              $cond: [
                { $lte: ["$currentStock", 0] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Category-wise stock summary
    const categoryStock = await Inventory.aggregate([
      { $match: { storeId } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          productCount: { $sum: 1 },
          totalStock: { $sum: "$currentStock" },
          totalValue: { $sum: "$totalValue" },
          lowStockCount: {
            $sum: {
              $cond: [
                { $lte: ["$currentStock", "$reorderPoint"] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { totalValue: -1 },
      },
    ]);

    const dashboardData = {
      summary: inventoryMetrics[0] || {
        totalProducts: 0,
        totalStockValue: 0,
        totalCurrentStock: 0,
        averageStockLevel: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
      },
      categoryBreakdown: categoryStock,
      recentAlerts: lowStockItems.slice(0, 10), // Last 10 alerts
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error in getInventorySummary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Transfer stock between stores (for multi-store setup)
export const transferStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { 
      targetStoreId, 
      quantity, 
      reason, 
      notes 
    } = req.body;
    const sourceStoreId = req.user.storeId;

    if (!targetStoreId || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: "Target store ID, quantity, and reason are required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (sourceStoreId.toString() === targetStoreId) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer to the same store",
      });
    }

    // Check if user has access to both stores
    if (!req.user.canAccessStore(targetStoreId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to target store",
      });
    }

    // Get source inventory
    const sourceInventory = await Inventory.findOne({ 
      productId, 
      storeId: sourceStoreId 
    });

    if (!sourceInventory) {
      return res.status(404).json({
        success: false,
        message: "Source inventory not found",
      });
    }

    if (sourceInventory.availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock for transfer",
      });
    }

    // Get or create target inventory
    let targetInventory = await Inventory.findOne({ 
      productId, 
      storeId: targetStoreId 
    });

    if (!targetInventory) {
      const product = await Product.findById(productId);
      targetInventory = new Inventory({
        productId,
        storeId: targetStoreId,
        currentStock: 0,
        reorderPoint: product.reorderPoint || 10,
        lastUpdatedBy: req.user._id,
      });
    }

    // Perform transfer
    await sourceInventory.removeStock(
      quantity,
      `Transfer to store ${targetStoreId}: ${reason}`,
      req.user._id,
      `TRANSFER-${Date.now()}`,
      "transfer"
    );

    await targetInventory.addStock(
      quantity,
      `Transfer from store ${sourceStoreId}: ${reason}`,
      req.user._id,
      `TRANSFER-${Date.now()}`,
      "transfer"
    );

    res.status(200).json({
      success: true,
      message: "Stock transferred successfully",
      transfer: {
        productId,
        sourceStoreId,
        targetStoreId,
        quantity,
        reason,
        transferredAt: new Date(),
        transferredBy: req.user._id,
      },
    });
  } catch (error) {
    console.error("Error in transferStock:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Generate inventory report
export const generateInventoryReport = async (req, res) => {
  try {
    const {
      reportType = "current_stock",
      category,
      lowStock,
      format = "json",
      startDate,
      endDate,
    } = req.query;
    const storeId = req.user.storeId;

    let pipeline = [
      { $match: { storeId } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          "product.isActive": true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
    ];

    // Apply filters based on report type
    switch (reportType) {
      case "low_stock":
        pipeline.push({
          $match: {
            $expr: {
              $lte: ["$currentStock", "$reorderPoint"],
            },
          },
        });
        break;
      
      case "out_of_stock":
        pipeline.push({
          $match: {
            currentStock: { $lte: 0 },
          },
        });
        break;
      
      case "stock_movements":
        if (startDate && endDate) {
          pipeline.push({
            $match: {
              "stockMovements.timestamp": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
          });
        }
        break;
    }

    // Add category filter
    if (category && category !== "all") {
      pipeline.push({
        $match: {
          "product.category": mongoose.Types.ObjectId(category),
        },
      });
    }

    // Project final fields
    pipeline.push({
      $project: {
        productName: "$product.productName",
        barcode: "$product.barcode",
        brand: "$product.brand",
        categoryName: { $arrayElemAt: ["$category.name", 0] },
        currentStock: 1,
        reorderPoint: 1,
        maxStockLevel: 1,
        sellingPrice: "$product.sellingPrice",
        costPrice: "$product.costPrice",
        totalValue: 1,
        lastRestocked: 1,
        lastSold: 1,
        stockMovements: reportType === "stock_movements" ? 1 : 0,
        alerts: 1,
      },
    });

    const reportData = await Inventory.aggregate(pipeline);

    res.status(200).json({
      success: true,
      reportType,
      generatedAt: new Date(),
      totalRecords: reportData.length,
      data: reportData,
    });
  } catch (error) {
    console.error("Error in generateInventoryReport:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
