const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      whatsapp: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      notes: {
        type: String,
        default: "",
        trim: true,
      },
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
        isVegetarian: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["amount", "percentage"],
      default: "amount",
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    deliveryDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    // User tracking and branch management
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    billSentAt: { type: Date },
    billImageUrl: { type: String },
    lastBillError: { type: String },
    lastBillAttempt: { type: Date },
    whatsappMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
orderSchema.index({ branch: 1, status: 1 });
orderSchema.index({ createdBy: 1 });
orderSchema.index({ orderNumber: 1 });

// Pre-save middleware to generate order number
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.models.Order.countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

// Pre-save middleware to calculate final amount
orderSchema.pre("save", function (next) {
  let discountAmount = 0;

  if (this.discountType === "percentage") {
    discountAmount = (this.totalAmount * this.discount) / 100;
  } else {
    discountAmount = this.discount;
  }

  this.finalAmount = Math.max(0, this.totalAmount - discountAmount);
  next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
