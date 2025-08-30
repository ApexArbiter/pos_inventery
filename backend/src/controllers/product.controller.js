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
      products,
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

    res.status(200).json(product);
  } catch (error) {
    console.error("Error in getProductById: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new product (Manager only)
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      items,
      description,
      category,
      subCategory,
      price,
      minPersons,
      discountedPrice,
      notes,
      isVegetarian,
      image,
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !price) {
      return res.status(400).json({
        error:
          "Missing required fields: name, description, category, and price are required",
      });
    }

    // Parse items if it's a string
    let parsedItems = items;
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = items.split(",").map((item) => item.trim());
      }
    }

    // Handle image upload to Cloudinary
    let imageUrl = null;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "products",
          resource_type: "image",
        });
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Error uploading image to Cloudinary:", uploadError);
        return res.status(400).json({
          error: "Failed to upload image. Please try again.",
        });
      }
    }

    const newProduct = new Product({
      name,
      items: parsedItems || [],
      description,
      category,
      subCategory,
      price: parseFloat(price),
      minPersons: minPersons ? parseInt(minPersons) : undefined,
      discountedPrice: discountedPrice
        ? parseFloat(discountedPrice)
        : undefined,
      notes,
      isVegetarian: isVegetarian === "true" || isVegetarian === true,
      image: imageUrl,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error in createProduct: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update product (Manager only)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      items,
      description,
      category,
      subCategory,
      price,
      minPersons,
      discountedPrice,
      notes,
      isVegetarian,
      image, // Can be a URL, base64 string, or empty
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Parse items if needed
    let parsedItems = items;
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = items.split(",").map((item) => item.trim());
      }
    }

    // Handle image logic
    let imageUrl = product.image;

    if (image) {
      if (image.startsWith("http")) {
        // Case 1: image is an existing URL from frontend — keep it
        imageUrl = image;
      } else {
        // Case 3: new file (e.g., base64) — upload to Cloudinary
        try {
          const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: "products",
            resource_type: "image",
          });
          imageUrl = uploadResponse.secure_url;
        } catch (uploadError) {
          console.error("Error uploading image to Cloudinary:", uploadError);
          return res.status(400).json({ error: "Failed to upload image." });
        }
      }
    } else {
      // Case 2: image is not provided — treat as removal
      imageUrl = ""; // or `null`, based on your DB schema
    }

    const updateData = {
      name: name || product.name,
      items: parsedItems !== undefined ? parsedItems : product.items,
      description: description || product.description,
      category: category || product.category,
      subCategory: subCategory || product.subCategory,
      price: price ? parseFloat(price) : product.price,
      minPersons: minPersons ? parseInt(minPersons) : product.minPersons,
      discountedPrice: discountedPrice
        ? parseFloat(discountedPrice)
        : product.discountedPrice,
      notes: notes !== undefined ? notes : product.notes,
      isVegetarian:
        isVegetarian !== undefined
          ? isVegetarian === "true" || isVegetarian === true
          : product.isVegetarian,
      image: imageUrl,
    };

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error in updateProduct: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete product (Manager only)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product: deletedProduct,
    });
  } catch (error) {
    console.error("Error in deleteProduct: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get products by category (for manager selection)
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({ category }).sort({ name: 1 });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error in getProductsByCategory: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error in getAllCategories: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({ name: name.trim() });
    const savedCategory = await newCategory.save();

    res.status(201).json({
      message: "Category created successfully",
      category: savedCategory,
    });
  } catch (error) {
    console.error("Error in createCategory: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if it's a default category
    if (category.isDefault) {
      return res.status(400).json({ 
        error: "Cannot delete default category" 
      });
    }

    // Check if any products are using this category
    const productsUsingCategory = await Product.countDocuments({ 
      category: category.name 
    });

    if (productsUsingCategory > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. ${productsUsingCategory} product(s) are using this category.` 
      });
    }

    await Category.findByIdAndDelete(id);

    res.status(200).json({
      message: "Category deleted successfully",
      category: category,
    });
  } catch (error) {
    console.error("Error in deleteCategory: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
