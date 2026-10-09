const mongoose = require("mongoose");
const Product = require("../models/product");
const connectDatabase = require("../config/database");

async function createProduct(req, res) {
    try {
        await connectDatabase();

        const { title, description, price, category, imageUrl } = req.body;

        if (!title || !description || !category || price === undefined || price === null || price === "") {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios"
            });
        }

        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "El precio debe ser un número válido"
            });
        }

        const product = await Product.create({
            title,
            description,
            price: numericPrice,
            category,
            imageUrl: imageUrl || "",
            seller: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: "Producto publicado con éxito",
            product
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error al publicar el producto"
        });
    }
}

async function getProducts(req, res) {
    try {
        await connectDatabase();

        let { search, category, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
        page = parseInt(page) || 1;
        limit = Math.min(parseInt(limit) || 12, 48);

        const filter = { status: "Disponible" };

        if (search) {
            filter.$text = { $search: search };
        }
        if (category) {
            filter.category = category;
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.json({
            success: true,
            total,
            page,
            limit,
            data: products
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener los productos"
        });
    }
}

// Productos publicados por el usuario que inició sesión (disponibles y vendidos)
async function getMyProducts(req, res) {
    try {
        await connectDatabase();

        const products = await Product.find({ seller: req.user.id })
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            total: products.length,
            data: products
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener tus publicaciones"
        });
    }
}

// Editar un producto propio (solo si sigue disponible)
async function updateProduct(req, res) {
    try {
        await connectDatabase();

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Id de producto no válido"
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Solo puedes editar tus propios productos"
            });
        }

        if (product.status === "Vendido") {
            return res.status(400).json({
                success: false,
                message: "Este producto ya fue vendido y no se puede editar"
            });
        }

        const { title, description, price, category, imageUrl } = req.body;

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({ success: false, message: "El título no puede estar vacío" });
            }
            product.title = title;
        }

        if (description !== undefined) {
            if (!String(description).trim()) {
                return res.status(400).json({ success: false, message: "La descripción no puede estar vacía" });
            }
            product.description = description;
        }

        if (category !== undefined) {
            if (!String(category).trim()) {
                return res.status(400).json({ success: false, message: "La categoría no puede estar vacía" });
            }
            product.category = category;
        }

        if (price !== undefined && price !== "") {
            const numericPrice = parseFloat(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: "El precio debe ser un número válido"
                });
            }
            product.price = numericPrice;
        }

        if (imageUrl !== undefined) {
            product.imageUrl = imageUrl || "";
        }

        await product.save();

        return res.json({
            success: true,
            message: "Producto actualizado con éxito",
            product
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar el producto"
        });
    }
}

module.exports = {
    createProduct,
    getProducts,
    getMyProducts,
    updateProduct
};