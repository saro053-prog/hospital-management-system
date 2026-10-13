/**
 * Doctor & Department Controller
 * Handles physician directories, specializations, schedules, and clinical departments
 */

const db = require('../config/db');

async function getAllDoctors(req, res) {
  try {
    const { department_id } = req.query;
    let doctors = await db.query('SELECT * FROM `doctors`');

    if (department_id) {
      doctors = doctors.filter(d => d.department_id === parseInt(department_id));
    }

    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve doctors: ' + err.message });
  }
}

async function getDoctorById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.query('SELECT * FROM `doctors` WHERE `id` = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load doctor: ' + err.message });
  }
}

async function getAllDepartments(req, res) {
  try {
    const departments = await db.query('SELECT * FROM `departments` ORDER BY `name` ASC');
    res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load departments: ' + err.message });
  }
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  getAllDepartments
};
