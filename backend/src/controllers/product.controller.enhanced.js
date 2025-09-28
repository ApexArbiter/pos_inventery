import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Inventory from "../models/inventory.model.js";
import cloudinary from "../lib/cloudinary.js";

// Get all products with advanced filtering and search
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      isActive,
      lowStock,
      sortBy = "productName",
      sortOrder = "asc",
    } = req.query;

    const storeId = req.user.storeId;
    const filter = { storeId };

    // Apply filters
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (brand && brand !== "all") {
      filter.brand = brand;
    }

    if (typeof isActive === "boolean" || isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Aggregation pipeline for complex queries
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "productId",
          as: "inventory",
        },
      },
    ];

    // Add low stock filter if requested
    if (lowStock === "true") {
      pipeline.push({
        $match: {
          $expr: {
            $lte: [
              { $arrayElemAt: ["$inventory.currentStock", 0] },
              "$reorderPoint",
            ],
          },
        },
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: sort },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const products = await Product.aggregate(pipeline);
    const totalPipeline = [...pipeline.slice(0, -3)]; // Remove sort, skip, limit
    totalPipeline.push({ $count: "total" });
    const totalResult = await Product.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: productId, storeId })
      .populate("category", "name path")
      .populate("createdBy", "fullName")
      .populate("updatedBy", "fullName");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Get inventory information
    const inventory = await Inventory.findOne({ productId, storeId });

    res.status(200).json({
      success: true,
      product,
      inventory,
    });
  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product by barcode
export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ barcode, storeId, isActive: true })
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found with this barcode",
      });
    }

    // Get current inventory
    const inventory = await Inventory.findOne({ productId: product._id, storeId });

    res.status(200).json({
      success: true,
      product,
      inventory: {
        currentStock: inventory?.currentStock || 0,
        availableStock: inventory?.availableStock || 0,
        reservedStock: inventory?.reservedStock || 0,
      },
    });
  } catch (error) {
    console.error("Error in getProductByBarcode:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Search products (for POS terminal)
export const searchProducts = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    const storeId = req.user.storeId;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query must be at least 2 characters long",
      });
    }

    const products = await Product.searchProducts(storeId, query, {
      limit: parseInt(limit),
      sort: { productName: 1 },
    });

    // Get inventory for each product
    const productIds = products.map(p => p._id);
    const inventories = await Inventory.find({
      productId: { $in: productIds },
      storeId,
    });

    const inventoryMap = {};
    inventories.forEach(inv => {
      inventoryMap[inv.productId.toString()] = inv;
    });

    const productsWithInventory = products.map(product => ({
      ...product.toObject(),
      inventory: inventoryMap[product._id.toString()] || {
        currentStock: 0,
        availableStock: 0,
      },
    }));

    res.status(200).json({
      success: true,
      products: productsWithInventory,
    });
  } catch (error) {
    console.error("Error in searchProducts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      category,
      subCategory,
      brand,
      mrp,
      sellingPrice,
      costPrice,
      discountedPrice,
      gstRate,
      hsnCode,
      unit,
      weight,
      dimensions,
      minStockLevel,
      maxStockLevel,
      reorderPoint,
      isVegetarian,
      isReturnable,
      expiryDate,
      manufacturingDate,
      images,
      supplier,
      tags,
      notes,
      barcode,
    } = req.body;

    const storeId = req.user.storeId;

    // Validate required fields
    if (!productName || !description || !category || !mrp || !sellingPrice || !costPrice) {
      return res.status(400).json({
        success: false,
        message: "Required fields: productName, description, category, mrp, sellingPrice, costPrice",
      });
    }

    // Check if barcode already exists (if provided)
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode, storeId });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this barcode already exists",
        });
      }
    }

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    // Process images
    let processedImages = [];
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const uploadResponse = await cloudinary.uploader.upload(image.url || image, {
            folder: "pos_system/products",
          });
          processedImages.push({
            url: uploadResponse.secure_url,
            alt: image.alt || productName,
            isPrimary: i === 0,
          });
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
        }
      }
    }

    // Create product
    const newProduct = new Product({
      productName,
      description,
      category,
      subCategory,
      brand,
      mrp,
      sellingPrice,
      costPrice,
      discountedPrice,
      gstRate: gstRate || 0,
      hsnCode,
      unit: unit || "pcs",
      weight,
      dimensions,
      minStockLevel: minStockLevel || 0,
      maxStockLevel: maxStockLevel || 1000,
      reorderPoint: reorderPoint || 10,
      isVegetarian: isVegetarian || false,
      isReturnable: isReturnable !== false,
      expiryDate,
      manufacturingDate,
      images: processedImages,
      supplier,
      tags: tags || [],
      notes,
      barcode,
      storeId,
      createdBy: req.user._id,
    });

    const savedProduct = await newProduct.save();

    // Create initial inventory record
    const inventory = new Inventory({
      productId: savedProduct._id,
      storeId,
      currentStock: 0,
      reorderPoint: reorderPoint || 10,
      maxStockLevel: maxStockLevel || 1000,
      lastUpdatedBy: req.user._id,
    });

    await inventory.save();

    // Populate response
    const populatedProduct = await Product.findById(savedProduct._id)
      .populate("category", "name path")
      .populate("createdBy", "fullName");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: populatedProduct,
      inventory,
    });
  } catch (error) {
    console.error("Error in createProduct:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const {
      productName,
      description,
      category,
      subCategory,
      brand,
      mrp,
      sellingPrice,
      costPrice,
      discountedPrice,
      gstRate,
      hsnCode,
      unit,
      weight,
      dimensions,
      minStockLevel,
      maxStockLevel,
      reorderPoint,
      isVegetarian,
      isReturnable,
      isActive,
      expiryDate,
      manufacturingDate,
      images,
      supplier,
      tags,
      notes,
      barcode,
    } = req.body;

    // Check if barcode already exists (if being updated)
    if (barcode && barcode !== product.barcode) {
      const existingProduct = await Product.findOne({ barcode, storeId });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this barcode already exists",
        });
      }
    }

    // Process images if provided
    let processedImages = product.images;
    if (images && Array.isArray(images)) {
      processedImages = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.url && image.url.startsWith("http")) {
          // Existing image
          processedImages.push(image);
        } else {
          // New image to upload
          try {
            const uploadResponse = await cloudinary.uploader.upload(image.url || image, {
              folder: "pos_system/products",
            });
            processedImages.push({
              url: uploadResponse.secure_url,
              alt: image.alt || productName || product.productName,
              isPrimary: i === 0,
            });
          } catch (uploadError) {
            console.error("Image upload error:", uploadError);
          }
        }
      }
    }

    // Update product
    const updateData = {
      productName: productName || product.productName,
      description: description || product.description,
      category: category || product.category,
      subCategory: subCategory || product.subCategory,
      brand: brand || product.brand,
      mrp: mrp !== undefined ? mrp : product.mrp,
      sellingPrice: sellingPrice !== undefined ? sellingPrice : product.sellingPrice,
      costPrice: costPrice !== undefined ? costPrice : product.costPrice,
      discountedPrice: discountedPrice !== undefined ? discountedPrice : product.discountedPrice,
      gstRate: gstRate !== undefined ? gstRate : product.gstRate,
      hsnCode: hsnCode || product.hsnCode,
      unit: unit || product.unit,
      weight: weight || product.weight,
      dimensions: dimensions || product.dimensions,
      minStockLevel: minStockLevel !== undefined ? minStockLevel : product.minStockLevel,
      maxStockLevel: maxStockLevel !== undefined ? maxStockLevel : product.maxStockLevel,
      reorderPoint: reorderPoint !== undefined ? reorderPoint : product.reorderPoint,
      isVegetarian: isVegetarian !== undefined ? isVegetarian : product.isVegetarian,
      isReturnable: isReturnable !== undefined ? isReturnable : product.isReturnable,
      isActive: isActive !== undefined ? isActive : product.isActive,
      expiryDate: expiryDate || product.expiryDate,
      manufacturingDate: manufacturingDate || product.manufacturingDate,
      images: processedImages,
      supplier: supplier || product.supplier,
      tags: tags || product.tags,
      notes: notes !== undefined ? notes : product.notes,
      barcode: barcode || product.barcode,
      updatedBy: req.user._id,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    ).populate("category", "name path");

    // Update inventory reorder point if changed
    if (reorderPoint !== undefined && reorderPoint !== product.reorderPoint) {
      await Inventory.findOneAndUpdate(
        { productId, storeId },
        { 
          reorderPoint,
          lastUpdatedBy: req.user._id,
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error in updateProduct:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product has been used in any transactions
    const Transaction = (await import("../models/transaction.model.js")).default;
    const transactionCount = await Transaction.countDocuments({
      storeId,
      "items.productId": productId,
    });

    if (transactionCount > 0) {
      // Don't delete, just deactivate
      product.isActive = false;
      await product.save();

      return res.status(200).json({
        success: true,
        message: "Product deactivated (has transaction history)",
        product,
      });
    }

    // Delete inventory record
    await Inventory.deleteOne({ productId, storeId });

    // Delete product
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Generate barcode for product
export const generateBarcode = async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: productId, storeId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.barcode) {
      return res.status(400).json({
        success: false,
        message: "Product already has a barcode",
        barcode: product.barcode,
      });
    }

    // Generate new barcode
    const count = await Product.countDocuments({ storeId });
    const newBarcode = `${storeId.toString().slice(-4)}${String(count + 1).padStart(6, "0")}`;

    // Update product with new barcode
    product.barcode = newBarcode;
    product.updatedBy = req.user._id;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Barcode generated successfully",
      barcode: newBarcode,
      product,
    });
  } catch (error) {
    console.error("Error in generateBarcode:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Bulk import products from CSV
export const bulkImportProducts = async (req, res) => {
  try {
    const { products } = req.body; // Array of product objects
    const storeId = req.user.storeId;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required",
      });
    }

    const results = {
      success: [],
      errors: [],
      total: products.length,
    };

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      
      try {
        // Validate required fields
        if (!productData.productName || !productData.mrp || !productData.sellingPrice || !productData.costPrice) {
          results.errors.push({
            row: i + 1,
            error: "Missing required fields",
            data: productData,
          });
          continue;
        }

        // Check if barcode already exists
        if (productData.barcode) {
          const existingProduct = await Product.findOne({
            barcode: productData.barcode,
            storeId,
          });
          if (existingProduct) {
            results.errors.push({
              row: i + 1,
              error: "Barcode already exists",
              data: productData,
            });
            continue;
          }
        }

        // Find or create category
        let categoryId = productData.category;
        if (typeof categoryId === "string") {
          let category = await Category.findOne({
            name: categoryId,
            storeId,
          });
          
          if (!category) {
            category = new Category({
              name: categoryId,
              storeId,
              createdBy: req.user._id,
            });
            await category.save();
          }
          categoryId = category._id;
        }

        // Create product
        const newProduct = new Product({
          ...productData,
          category: categoryId,
          storeId,
          createdBy: req.user._id,
        });

        const savedProduct = await newProduct.save();

        // Create inventory record
        const inventory = new Inventory({
          productId: savedProduct._id,
          storeId,
          currentStock: productData.initialStock || 0,
          reorderPoint: productData.reorderPoint || 10,
          lastUpdatedBy: req.user._id,
        });

        await inventory.save();

        results.success.push({
          row: i + 1,
          productId: savedProduct._id,
          productName: savedProduct.productName,
          barcode: savedProduct.barcode,
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: productData,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed. ${results.success.length} products imported successfully, ${results.errors.length} errors`,
      results,
    });
  } catch (error) {
    console.error("Error in bulkImportProducts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product categories
export const getProductCategories = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const categories = await Category.getCategoryTree(storeId);

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error in getProductCategories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product brands
export const getProductBrands = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const brands = await Product.distinct("brand", { storeId, isActive: true });

    res.status(200).json({
      success: true,
      brands: brands.filter(Boolean), // Remove null/empty values
    });
  } catch (error) {
    console.error("Error in getProductBrands:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
