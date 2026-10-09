const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");
const Notification = require("../models/notification");
const connectDatabase = require("../config/database");

const METODOS_VALIDOS = ["Tarjeta", "PSE", "Contraentrega"];

function money(n) {
    return "$ " + Number(n || 0).toLocaleString("es-CO");
}

async function createOrder(req, res) {
    try {
        await connectDatabase();

        const { productId, shipping, payment } = req.body;

        // ---- Validaciones básicas ----
        if (!productId || !shipping || !payment) {
            return res.status(400).json({
                success: false,
                message: "Faltan datos de la compra (producto, envío o pago)"
            });
        }

        const { fullName, phone, department, city, address, notes } = shipping;

        if (!fullName || !phone || !department || !city || !address) {
            return res.status(400).json({
                success: false,
                message: "Completa los datos de envío: nombre, teléfono, departamento, ciudad y dirección"
            });
        }

        if (!METODOS_VALIDOS.includes(payment.method)) {
            return res.status(400).json({
                success: false,
                message: "Método de pago no válido"
            });
        }

        let paymentDetails = { brand: "", last4: "", holder: "", installments: 1 };

        if (payment.method === "Tarjeta") {
            const last4 = String(payment.last4 || "");
            const holder = String(payment.holder || "").trim();

            if (!/^\d{4}$/.test(last4) || !holder) {
                return res.status(400).json({
                    success: false,
                    message: "Datos de la tarjeta incompletos"
                });
            }

            paymentDetails = {
                brand: String(payment.brand || "Tarjeta").slice(0, 20),
                last4,
                holder: holder.slice(0, 60),
                installments: Math.min(Math.max(parseInt(payment.installments) || 1, 1), 36)
            };
        }

        // ---- Producto ----
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

        const fullAddress = `${address}, ${city}, ${department}`;

        const order = await Order.create({
            buyer: req.user.id,
            seller: product.seller,
            product: product._id,
            address: fullAddress,
            shipping: { fullName, phone, department, city, address, notes: notes || "" },
            paymentMethod: payment.method,
            paymentDetails,
            total: product.price,
            // Con tarjeta o PSE queda pagado; contraentrega se paga al recibir
            status: payment.method === "Contraentrega" ? "Pendiente" : "Pagado"
        });

        // ---- Notificación para el vendedor ----
        try {
            const buyer = await User.findById(req.user.id).select("name");

            await Notification.create({
                user: product.seller,
                type: "venta",
                title: "¡Vendiste tu producto!",
                message:
                    `${buyer ? buyer.name : "Un comprador"} compró "${product.title}" por ${money(product.price)}. ` +
                    `Enviar a: ${fullName}, ${address}, ${city} (${department}). ` +
                    `Tel: ${phone}. ` +
                    (payment.method === "Contraentrega" ? "Pago: contraentrega." : "Pago: confirmado."),
                product: product._id,
                order: order._id
            });
        } catch (notifError) {
            // Si falla la notificación, la compra igual queda hecha
            console.error("No se pudo crear la notificación:", notifError);
        }

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