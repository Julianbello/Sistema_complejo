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

        // Dirección completa en una sola línea (para mostrarla fácil)
        address: {
            type: String,
            required: true,
            trim: true
        },

        // Datos de envío por separado
        shipping: {
            fullName: { type: String, trim: true, default: "" },
            phone: { type: String, trim: true, default: "" },
            department: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            address: { type: String, trim: true, default: "" },
            notes: { type: String, trim: true, default: "" }
        },

        paymentMethod: {
            type: String,
            required: true
        },

        // IMPORTANTE: nunca se guarda el número completo ni el CVV de la tarjeta
        paymentDetails: {
            brand: { type: String, default: "" },
            last4: { type: String, default: "" },
            holder: { type: String, default: "" },
            installments: { type: Number, default: 1 }
        },

        total: {
            type: Number,
            default: 0
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