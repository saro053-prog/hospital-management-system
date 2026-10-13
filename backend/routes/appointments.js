const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, appointmentController.getAllAppointments);
router.post('/', authenticate, appointmentController.bookAppointment);
router.put('/:id/status', authenticate, authorize(['admin', 'doctor', 'receptionist']), appointmentController.updateAppointmentStatus);

module.exports = router;
