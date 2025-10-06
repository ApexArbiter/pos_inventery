import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    items: [{ type: String }],
    description: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String },
    price: { type: Number, required: true },
    minPersons: { type: Number },
    discountedPrice: { type: Number },
    notes: { type: String },
    isVegetarian: { type: Boolean, default: false },
    image: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
