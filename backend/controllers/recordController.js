/**
 * Medical Records & Electronic Health Records (EHR) Controller
 * Handles diagnostic records, vitals, and physician prescriptions
 */

const db = require('../config/db');

async function getAllRecords(req, res) {
  try {
    const { patient_id } = req.query;
    let records = await db.query('SELECT * FROM `medical_records` ORDER BY `id` DESC');

    if (patient_id) {
      records = records.filter(r => r.patient_id === parseInt(patient_id));
    }

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load medical records: ' + err.message });
  }
}

async function createRecord(req, res) {
  try {
    const {
      patient_id, doctor_id, appointment_id, diagnosis, symptoms,
      examination_notes, blood_pressure, heart_rate_bpm, temperature_f, weight_kg, prescriptions
    } = req.body;

    if (!patient_id || !doctor_id || !diagnosis || !symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, Doctor ID, Diagnosis, and Symptoms are required.'
      });
    }

    const result = await db.query(
      `INSERT INTO \`medical_records\`
        (\`patient_id\`, \`doctor_id\`, \`appointment_id\`, \`diagnosis\`, \`symptoms\`, \`examination_notes\`, \`blood_pressure\`, \`heart_rate_bpm\`, \`temperature_f\`, \`weight_kg\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id, doctor_id, appointment_id || null, diagnosis, symptoms,
        examination_notes || '', blood_pressure || '120/80', heart_rate_bpm || 72,
        temperature_f || 98.6, weight_kg || 70.0
      ]
    );

    const recordId = result.insertId || Date.now();

    // Insert attached prescriptions if provided
    if (prescriptions && Array.isArray(prescriptions)) {
      for (const rx of prescriptions) {
        if (rx.medicine_name) {
          await db.query(
            `INSERT INTO \`prescriptions\`
              (\`record_id\`, \`patient_id\`, \`doctor_id\`, \`medicine_name\`, \`dosage\`, \`frequency\`, \`duration\`, \`instructions\`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recordId, patient_id, doctor_id, rx.medicine_name,
              rx.dosage || '1 Tab', rx.frequency || 'Once daily',
              rx.duration || '7 days', rx.instructions || 'After meals'
            ]
          );
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Medical EHR record and prescriptions saved successfully.',
      record_id: recordId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save record: ' + err.message });
  }
}

module.exports = {
  getAllRecords,
  createRecord
};
