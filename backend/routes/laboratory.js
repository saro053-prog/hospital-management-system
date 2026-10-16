const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/tests', authenticate, labController.getTests);
router.get('/orders', authenticate, labController.getOrders);
router.post('/orders', authenticate, authorize(['admin', 'doctor', 'lab_staff', 'receptionist']), labController.createOrder);
router.put('/orders/:id', authenticate, authorize(['admin', 'doctor', 'lab_staff']), labController.updateOrder);

module.exports = router;
