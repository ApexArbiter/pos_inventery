import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false }, // Add this field
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;