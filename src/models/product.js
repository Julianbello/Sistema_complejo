const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        imageUrl: {
            type: String,
            default: ""
        },

        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["Disponible", "Vendido"],
            default: "Disponible"
        }
    },
    {
        timestamps: true
    }
);

productSchema.index({
    title: "text",
    description: "text",
    category: "text"
});

productSchema.index({
    category: 1,
    price: 1
});

module.exports = mongoose.model("Product", productSchema);