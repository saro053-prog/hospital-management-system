/**
 * Pharmacy & Medication Inventory Controller
 * Handles medicine catalog, stock levels, low-stock warnings, and dispensing
 */

const db = require('../config/db');

async function getMedicines(req, res) {
  try {
    const medicines = await db.query('SELECT * FROM `medicines`');
    res.json({
      success: true,
      data: medicines,
      medicines
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve medicine inventory: ' + err.message });
  }
}

async function dispenseMedicine(req, res) {
  try {
    const id = req.params.id || req.body.medicine_id || req.body.id;
    const { quantity } = req.body;

    const qty = parseInt(quantity) || 1;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Medicine ID is required for dispensing.' });
    }

    await db.query('UPDATE `medicines` SET `stock_quantity` = stock_quantity - ? WHERE `id` = ?', [qty, id]);

    res.json({
      success: true,
      message: `Successfully dispensed ${qty} unit(s). Inventory updated.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to dispense medication: ' + err.message });
  }
}

module.exports = {
  getMedicines,
  dispenseMedicine
};
