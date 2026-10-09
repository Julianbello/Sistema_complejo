const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('./authMiddleware');

router.get('/', authMiddleware, notificationController.getMyNotifications);
router.patch('/read-all', authMiddleware, notificationController.markAllRead);

module.exports = router;