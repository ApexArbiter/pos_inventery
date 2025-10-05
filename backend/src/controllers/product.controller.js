import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";
import Category from "../models/category.model.js";

// Get all products (for manager to select from)
export const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      isVegetarian,
      search,
      page = 1,
      limit = 50, // Increased limit for manager selection
    } = req.query;

    // Build filter object
    const filter = {};

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (isVegetarian !== undefined)
      filter.isVegetarian = isVegetarian === "true";

    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort({ category: 1, name: 1 }) // Sort by category then name for better organization
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllProducts: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error("Error in getProductById: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new product (Manager only)
export const createProduct = async (req, res) => {
  try {
    const {
      productName,
      barcode,
      category,
      sellingPrice,
      costPrice,
      description,
      gstRate,
      hsnCode,
      unit,
      images,
      createdBy,
      storeId,
      mrp
    } = req.body;

    // Validate required fields
    if (!productName || !sellingPrice || !costPrice) {
      return res.status(400).json({
        success: false,
        message: "Product name, selling price, and cost price are required"
      });
    }

    // Set mrp if not provided
    const mrpValue = mrp || sellingPrice;

    // Create new product
    const newProduct = new Product({
      productName,
      barcode: barcode || Date.now().toString(),
      category,
      mrp: parseFloat(mrpValue),
      sellingPrice: parseFloat(sellingPrice),
      costPrice: parseFloat(costPrice),
      description: description || 'No description provided',
      gstRate: parseFloat(gstRate) || 18,
      hsnCode: hsnCode || '',
      unit: unit || 'pcs',
      images: images || [],
      createdBy,
      storeId,
      isActive: true,
      isReturnable: true
    });

    const savedProduct = await newProduct.save();

    // Create inventory record for this product
    try {
      const Inventory = (await import('../models/inventory.model.js')).default;
      const inventoryRecord = new Inventory({
        productId: savedProduct._id,
        productDetails: {
          productName: savedProduct.productName,
          barcode: savedProduct.barcode,
          description: savedProduct.description,
          category: savedProduct.category,
          mrp: savedProduct.mrp,
          sellingPrice: savedProduct.sellingPrice,
          costPrice: savedProduct.costPrice,
          unit: savedProduct.unit,
          images: savedProduct.images || [],
          isActive: savedProduct.isActive,
          isReturnable: savedProduct.isReturnable,
          minStockLevel: savedProduct.minStockLevel || 10,
          maxStockLevel: savedProduct.maxStockLevel || 100,
          reorderPoint: savedProduct.reorderPoint || 15
        },
        storeId: savedProduct.storeId,
        currentStock: savedProduct.currentStock,
        lastUpdated: new Date(),
        movements: [{
          type: 'initial_stock',
          quantity: savedProduct.currentStock,
          reason: 'Initial stock when product was created',
          timestamp: new Date()
        }]
      });
      await inventoryRecord.save();
      console.log('Inventory record created for product:', savedProduct.productName);
    } catch (inventoryError) {
      console.error('Error creating inventory record:', inventoryError);
      // Don't fail the product creation if inventory creation fails
    }

    res.status(201).json({
      success: true,
      data: savedProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error("Error in createProduct: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};

// Update product (Manager only)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      barcode,
      category,
      sellingPrice,
      costPrice,
      description,
      gstRate,
      hsnCode,
      unit,
      images
    } = req.body;

    const updateData = {};
    if (productName) updateData.productName = productName;
    if (barcode) updateData.barcode = barcode;
    if (category) updateData.category = category;
    if (sellingPrice) updateData.sellingPrice = parseFloat(sellingPrice);
    if (costPrice) updateData.costPrice = parseFloat(costPrice);
    if (description) updateData.description = description;
    if (gstRate) updateData.gstRate = parseFloat(gstRate);
    if (hsnCode) updateData.hsnCode = hsnCode;
    if (unit) updateData.unit = unit;
    if (images) updateData.images = images;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error("Error in updateProduct: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};

// Delete product (Manager only)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteProduct: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};

// Get products by category (for manager selection)
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({ category }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error("Error in getProductsByCategory: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("Error in getAllCategories: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const newCategory = new Category({
      name,
      isActive: true,
    });

    const savedCategory = await newCategory.save();

    res.status(201).json({
      success: true,
      data: savedCategory,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error("Error in createCategory: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteCategory: ", error.message);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
};