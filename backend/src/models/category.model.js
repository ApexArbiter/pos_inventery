import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    path: {
      type: String, // e.g., "Electronics > Mobile > Smartphones"
    },
    image: {
      type: String,
    },
    icon: {
      type: String, // Icon class or URL
    },
    color: {
      type: String,
      default: "#3b82f6",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
categorySchema.index({ name: 1, storeId: 1 }, { unique: true });
categorySchema.index({ storeId: 1, parentCategory: 1 });
categorySchema.index({ storeId: 1, isActive: 1 });
categorySchema.index({ path: 1 });

// Pre-save middleware to update path and level
categorySchema.pre("save", async function (next) {
  if (this.parentCategory) {
    const parent = await mongoose.models.Category.findById(this.parentCategory);
    if (parent) {
      this.level = parent.level + 1;
      this.path = parent.path ? `${parent.path} > ${this.name}` : this.name;
    }
  } else {
    this.level = 0;
    this.path = this.name;
  }
  next();
});

// Method to get all subcategories
categorySchema.methods.getSubcategories = function () {
  return mongoose.models.Category.find({
    parentCategory: this._id,
    isActive: true,
  }).sort({ sortOrder: 1, name: 1 });
};

// Method to get category hierarchy
categorySchema.methods.getHierarchy = async function () {
  const hierarchy = [];
  let current = this;
  
  while (current) {
    hierarchy.unshift({
      _id: current._id,
      name: current.name,
      level: current.level,
    });
    
    if (current.parentCategory) {
      current = await mongoose.models.Category.findById(current.parentCategory);
    } else {
      current = null;
    }
  }
  
  return hierarchy;
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = function (storeId) {
  return this.find({ storeId, isActive: true })
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .then(categories => {
      const categoryMap = new Map();
      const rootCategories = [];
      
      // Create a map of all categories
      categories.forEach(category => {
        categoryMap.set(category._id.toString(), {
          ...category.toObject(),
          children: [],
        });
      });
      
      // Build the tree structure
      categories.forEach(category => {
        if (category.parentCategory) {
          const parent = categoryMap.get(category.parentCategory.toString());
          if (parent) {
            parent.children.push(categoryMap.get(category._id.toString()));
          }
        } else {
          rootCategories.push(categoryMap.get(category._id.toString()));
        }
      });
      
      return rootCategories;
    });
};

// Static method to get category statistics
categorySchema.statics.getCategoryStats = function (storeId) {
  return this.aggregate([
    { $match: { storeId: mongoose.Types.ObjectId(storeId), isActive: true } },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "category",
        as: "products",
      },
    },
    {
      $project: {
        name: 1,
        level: 1,
        productCount: { $size: "$products" },
        hasSubcategories: { $gt: ["$level", 0] },
      },
    },
    {
      $sort: { productCount: -1 },
    },
  ]);
};

const Category = mongoose.model("Category", categorySchema);

export default Category;