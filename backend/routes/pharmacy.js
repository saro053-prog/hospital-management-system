const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, pharmacyController.getMedicines);
router.get('/medicines', authenticate, pharmacyController.getMedicines);
router.post('/dispense', authenticate, authorize(['admin', 'doctor', 'nurse', 'receptionist']), pharmacyController.dispenseMedicine);
router.post('/:id/dispense', authenticate, authorize(['admin', 'doctor', 'nurse', 'receptionist']), pharmacyController.dispenseMedicine);

module.exports = router;
