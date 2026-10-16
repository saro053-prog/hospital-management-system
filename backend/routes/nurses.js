const express = require('express');
const router = express.Router();
const nurseController = require('../controllers/nurseController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, nurseController.getNurses);
router.get('/duty', authenticate, nurseController.getNurses);
router.get('/vitals', authenticate, nurseController.getVitals);
router.post('/vitals', authenticate, authorize(['admin', 'doctor', 'nurse']), nurseController.recordVitals);

module.exports = router;
