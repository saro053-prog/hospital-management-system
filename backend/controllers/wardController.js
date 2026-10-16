/**
 * Wards & Bed Occupancy Controller
 * Manages clinical wards, bed occupancy telemetry, and admission assignments
 */

const db = require('../config/db');

async function getWards(req, res) {
  try {
    const wards = await db.query('SELECT * FROM `wards`');
    res.json({
      success: true,
      data: wards,
      wards
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve wards: ' + err.message });
  }
}

async function getBeds(req, res) {
  try {
    const beds = await db.query('SELECT * FROM `beds`');
    const totalBeds = beds.length;
    const occupied = beds.filter(b => b.status === 'Occupied').length;
    const available = beds.filter(b => b.status === 'Available').length;
    const reserved = beds.filter(b => b.status === 'Reserved').length;

    res.json({
      success: true,
      summary: {
        totalBeds,
        occupied,
        available,
        reserved,
        occupancyRate: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0
      },
      data: beds,
      beds
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve beds: ' + err.message });
  }
}

async function updateBed(req, res) {
  try {
    const { id } = req.params;
    const { status, patient_id } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    await db.query('UPDATE `beds` SET `status` = ?, `patient_id` = ? WHERE `id` = ?', [status, patient_id || null, id]);

    res.json({
      success: true,
      message: `Bed allocation updated to [${status}].`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update bed status: ' + err.message });
  }
}

module.exports = {
  getWards,
  getBeds,
  updateBed
};
