const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, statsController.getDashboardStats);

module.exports = router;
