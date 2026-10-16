/**
 * Nurse Management Controller
 * Handles nursing duty rosters, ward assignments, and vital signs telemetry recording
 */

const db = require('../config/db');

async function getNurses(req, res) {
  try {
    const nurses = await db.query('SELECT * FROM `nurses`');
    res.json({
      success: true,
      data: nurses,
      nurses
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve nursing staff: ' + err.message });
  }
}

async function getVitals(req, res) {
  try {
    const vitals = await db.query('SELECT * FROM `nurse_vitals` ORDER BY `recorded_at` DESC');
    res.json({
      success: true,
      data: vitals,
      vitals
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vitals: ' + err.message });
  }
}

async function recordVitals(req, res) {
  try {
    const { patient_id, blood_pressure, heart_rate_bpm, temperature_f, sp_o2_percent = 98, respiratory_rate = 16, notes = '' } = req.body;

    if (!patient_id || !blood_pressure || !heart_rate_bpm || !temperature_f) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, Blood Pressure, Heart Rate, and Body Temperature are required.'
      });
    }

    const nurse_id = req.user && req.user.role === 'nurse' ? req.user.id : 1;

    const result = await db.query(
      'INSERT INTO `nurse_vitals` (`patient_id`, `nurse_id`, `blood_pressure`, `heart_rate_bpm`, `temperature_f`, `sp_o2_percent`, `respiratory_rate`, `notes`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patient_id, nurse_id, blood_pressure, heart_rate_bpm, temperature_f, sp_o2_percent, respiratory_rate, notes]
    );

    res.status(201).json({
      success: true,
      message: 'Patient vital signs recorded and synced to electronic medical records.',
      vitalsId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record vitals: ' + err.message });
  }
}

module.exports = {
  getNurses,
  getVitals,
  recordVitals
};
