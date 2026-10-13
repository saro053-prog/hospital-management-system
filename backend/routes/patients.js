const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, patientController.getAllPatients);
router.get('/:id', authenticate, patientController.getPatientById);
router.post('/', authenticate, authorize(['admin', 'doctor', 'receptionist']), patientController.createPatient);

module.exports = router;
