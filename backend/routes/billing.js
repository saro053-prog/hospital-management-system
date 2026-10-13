const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, billingController.getAllInvoices);
router.post('/', authenticate, authorize(['admin', 'receptionist']), billingController.createInvoice);
router.post('/:id/pay', authenticate, authorize(['admin', 'receptionist', 'patient']), billingController.recordPayment);

module.exports = router;
