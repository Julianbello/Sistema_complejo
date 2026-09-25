const Product = require("../models/product");
const Order = require("../models/order");
const connectDatabase = require("../config/database");

async function createOrder(req, res) {
    try {
        await connectDatabase();

        const { productId, address, paymentMethod } = req.body;

        if (!productId || !address || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios (producto, dirección o método de pago)"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        if (product.seller.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "No puedes comprar tu propio producto"
            });
        }

        if (product.status !== "Disponible") {
            return res.status(400).json({
                success: false,
                message: "El producto ya no está disponible"
            });
        }

        // Actualización atómica: evita que dos compradores compren el mismo producto a la vez
        const updatedProduct = await Product.findOneAndUpdate(
            { _id: productId, status: "Disponible" },
            { status: "Vendido" },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(409).json({
                success: false,
                message: "El producto acaba de ser vendido a otro comprador"
            });
        }

        const order = await Order.create({
            buyer: req.user.id,
            seller: product.seller,
            product: product._id,
            address,
            paymentMethod,
            status: "Pagado"
        });

        return res.status(201).json({
            success: true,
            message: "Compra realizada con éxito",
            order
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error al procesar la compra"
        });
    }
}

module.exports = {
    createOrder
};