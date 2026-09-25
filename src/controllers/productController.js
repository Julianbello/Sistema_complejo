// src/controllers/productController.js
const { products } = require('../models/dataStore');

exports.createProduct = (req, res) => {
    const { titulo, descripcion, precio, categoria, imagenes } = req.body;
    if (!titulo || !descripcion || !precio || !categoria || !imagenes || imagenes.length === 0) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const newProduct = {
        id: `prod_${Date.now()}`,
        vendedorId: req.user.id,
        titulo,
        descripcion,
        precio: parseFloat(precio),
        categoria,
        imagenes,
        estado: 'Disponible',
        createdAt: new Date()
    };

    products.push(newProduct);
    res.status(201).json({ message: 'Producto publicado con éxito', product: newProduct });
};

exports.getProducts = (req, res) => {
    let { search, category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
    let filtered = products.filter(p => p.estado === 'Disponible');

    if (search) {
        filtered = filtered.filter(p => 
            p.titulo.toLowerCase().includes(search.toLowerCase()) || 
            p.descripcion.toLowerCase().includes(search.toLowerCase())
        );
    }
    if (category) filtered = filtered.filter(p => p.categoria.toLowerCase() === category.toLowerCase());
    if (minPrice) filtered = filtered.filter(p => p.precio >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(p => p.precio <= parseFloat(maxPrice));

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + parseInt(limit));

    res.json({ total: filtered.length, page: parseInt(page), limit: parseInt(limit), data: paginated });
};