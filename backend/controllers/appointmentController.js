/**
 * Appointment Controller
 * Handles booking, triage, scheduling tokens, and status transitions
 */

const db = require('../config/db');

async function getAllAppointments(req, res) {
  try {
    const { status, date } = req.query;
    let appointments = await db.query('SELECT * FROM `appointments` ORDER BY `id` DESC');

    if (status) {
      appointments = appointments.filter(a => a.status.toLowerCase() === status.toLowerCase());
    }

    if (date) {
      appointments = appointments.filter(a => a.appointment_date === date);
    }

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve appointments: ' + err.message });
  }
}

async function bookAppointment(req, res) {
  try {
    const { patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, notes } = req.body;

    if (!patient_id || !doctor_id || !department_id || !appointment_date || !appointment_time || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, Department, Appointment Date, Time, and Clinical Reason are required.'
      });
    }

    const appointment_number = `APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(
      `INSERT INTO \`appointments\` 
        (\`appointment_number\`, \`patient_id\`, \`doctor_id\`, \`department_id\`, \`appointment_date\`, \`appointment_time\`, \`reason\`, \`notes\`) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, notes || '']
    );

    res.status(201).json({
      success: true,
      message: `Appointment ${appointment_number} scheduled successfully!`,
      data: {
        id: result.insertId || Date.now(),
        appointment_number,
        appointment_date,
        appointment_time,
        status: 'Scheduled'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to book appointment: ' + err.message });
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['Scheduled', 'Completed', 'Cancelled', 'No-Show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose from: ${validStatuses.join(', ')}`
      });
    }

    await db.query('UPDATE `appointments` SET `status` = ? WHERE `id` = ?', [status, id]);

    res.json({
      success: true,
      message: `Appointment #${id} updated to '${status}'.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update appointment: ' + err.message });
  }
}

module.exports = {
  getAllAppointments,
  bookAppointment,
  updateAppointmentStatus
};
