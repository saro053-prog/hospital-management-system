const express = require('express');
const router = express.Router();
const wardController = require('../controllers/wardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, wardController.getWards);
router.get('/beds', authenticate, wardController.getBeds);
router.put('/beds/:id', authenticate, authorize(['admin', 'doctor', 'nurse', 'receptionist']), wardController.updateBed);

module.exports = router;
