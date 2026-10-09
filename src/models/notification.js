const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: ["sale"], default: "sale" },
        message: { type: String, required: true },
        buyerName: { type: String, default: "" },
        buyerPhone: { type: String, default: "" },
        address: { type: String, default: "" },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        read: { type: Boolean, default: false }
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);