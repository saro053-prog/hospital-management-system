/**
 * Patient Controller
 * Handles patient directory, registration, search, and medical profiles
 */

const db = require('../config/db');

async function getAllPatients(req, res) {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM `patients` ORDER BY `id` DESC';
    let params = [];

    let rows = await db.query(sql, params);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.patient_code && p.patient_code.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.blood_group && p.blood_group.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve patients: ' + err.message });
  }
}

async function getPatientById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.query('SELECT * FROM `patients` WHERE `id` = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const patient = rows[0];

    // Fetch patient appointments
    const appointments = await db.query('SELECT * FROM `appointments` WHERE `patient_id` = ?', [id]);

    // Fetch medical records
    const records = await db.query('SELECT * FROM `medical_records` WHERE `patient_id` = ?', [id]);

    // Fetch billing history
    const bills = await db.query('SELECT * FROM `billing` WHERE `patient_id` = ?', [id]);

    res.json({
      success: true,
      data: {
        ...patient,
        appointments: appointments || [],
        medical_records: records || [],
        billing_history: bills || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load patient: ' + err.message });
  }
}

async function createPatient(req, res) {
  try {
    const {
      name, dob, gender, blood_group, phone, email, address, city,
      emergency_contact_name, emergency_contact_phone, known_allergies, insurance_provider
    } = req.body;

    if (!name || !dob || !gender || !blood_group || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, DOB, gender, blood group, phone number, and address are required.'
      });
    }

    const patient_code = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(
      `INSERT INTO \`patients\` 
        (\`patient_code\`, \`name\`, \`dob\`, \`gender\`, \`blood_group\`, \`phone\`, \`email\`, \`address\`, \`city\`, \`emergency_contact_name\`, \`emergency_contact_phone\`, \`known_allergies\`, \`insurance_provider\`) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_code, name, dob, gender, blood_group, phone, email || '',
        address, city || 'Chennai', emergency_contact_name || '', emergency_contact_phone || '',
        known_allergies || 'None', insurance_provider || 'Self-Pay'
      ]
    );

    res.status(201).json({
      success: true,
      message: `Patient ${name} registered successfully with code ${patient_code}.`,
      data: {
        id: result.insertId || Date.now(),
        patient_code,
        name,
        phone,
        blood_group
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error registering patient: ' + err.message });
  }
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient
};
