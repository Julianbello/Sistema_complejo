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

        let { search, category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

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

module.exports = {
    createProduct,
    getProducts
};