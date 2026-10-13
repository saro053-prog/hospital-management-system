const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, recordController.getAllRecords);
router.post('/', authenticate, authorize(['admin', 'doctor']), recordController.createRecord);

module.exports = router;
