const User = require("../models/user");
const Notification = require("../models/notification");
const { sendMail } = require("./mailer");

async function notifySeller({ order, product, buyerId }) {
    try {
        const [buyer, seller] = await Promise.all([
            User.findById(buyerId).select("name phone"),
            User.findById(order.seller).select("name email")
        ]);

        const price = Number(product.price || 0).toLocaleString("es");
        const buyerName = buyer ? buyer.name : "Un comprador";
        const buyerPhone = buyer ? buyer.phone : "";

        const message = `¡Vendiste "${product.title}" por $ ${price}!`;

        await Notification.create({
            user: order.seller,
            type: "sale",
            message,
            buyerName,
            buyerPhone,
            address: order.address,
            order: order._id,
            product: product._id
        });

        if (seller && seller.email) {
            try {
                await sendMail({
                    to: seller.email,
                    subject: `¡Vendiste ${product.title}! - GIATE`,
                    text:
                        `Hola ${seller.name},\n\n` +
                        `${message}\n\n` +
                        `Datos del comprador:\n` +
                        `- Nombre: ${buyerName}\n` +
                        `- Teléfono: ${buyerPhone}\n` +
                        `- Dirección de entrega: ${order.address}\n` +
                        `- Método de pago: ${order.paymentMethod}\n\n` +
                        `Contáctalo para coordinar la entrega.\n\n— GIATE`
                });
            } catch (mailError) {
                console.error("No se pudo enviar el correo:", mailError.message);
            }
        }
    } catch (error) {
        console.error("No se pudo notificar al vendedor:", error);
    }
}

module.exports = { notifySeller };