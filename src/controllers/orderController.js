// src/controllers/orderController.js
const { products, orders } = require('../models/dataStore');

exports.createOrder = (req, res) => {
    const { productoId, direccionEntrega, metodoPago } = req.body;
    const product = products.find(p => p.id === productoId);

    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.vendedorId === req.user.id) {
        return res.status(400).json({ error: 'No puedes comprar tu propio producto' });
    }
    if (product.estado !== 'Disponible') {
        return res.status(400).json({ error: 'El producto ya no está disponible' });
    }

    product.estado = 'Vendido';
    const newOrder = {
        id: `ord_${Date.now()}`,
        compradorId: req.user.id,
        productoId,
        total: product.precio,
        direccionEntrega,
        metodoPago,
        estado: 'Completado',
        createdAt: new Date()
    };

    orders.push(newOrder);
    res.status(201).json({ message: 'Compra realizada con éxito', order: newOrder });
};