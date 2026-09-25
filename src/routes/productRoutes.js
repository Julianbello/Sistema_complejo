const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('./authMiddleware');

router.get('/', productController.getProducts);
router.post('/', authMiddleware, productController.createProduct);

module.exports = router;