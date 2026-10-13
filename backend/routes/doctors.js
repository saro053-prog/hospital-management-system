const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, doctorController.getAllDoctors);
router.get('/departments', authenticate, doctorController.getAllDepartments);
router.get('/:id', authenticate, doctorController.getDoctorById);

module.exports = router;
