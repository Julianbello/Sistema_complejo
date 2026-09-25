const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        address: {
            type: String,
            required: true,
            trim: true
        },

        paymentMethod: {
            type: String,
            required: true
        },

        paymentId: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: [
                "Pendiente",
                "Pagado",
                "Cancelado"
            ],
            default: "Pendiente"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Order", orderSchema);