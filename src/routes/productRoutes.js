const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('./authMiddleware');
 
router.get('/', productController.getProducts);
 
// OJO: "/mine" debe ir ANTES de "/:id", si no Express lo toma como un id
router.get('/mine', authMiddleware, productController.getMyProducts);
 
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);
 
module.exports = router;