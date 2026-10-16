/**
 * Laboratory Management Controller
 * Handles test catalog, specimen orders, result verification, and diagnostic reports
 */

const db = require('../config/db');

async function getTests(req, res) {
  try {
    const tests = await db.query('SELECT * FROM `lab_tests`');
    res.json({
      success: true,
      data: tests,
      tests
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve test catalog: ' + err.message });
  }
}

async function getOrders(req, res) {
  try {
    let orders = await db.query('SELECT * FROM `lab_orders`');

    // If patient requests, filter only their orders
    if (req.user && req.user.role === 'patient') {
      const patient = (await db.query('SELECT * FROM `patients` WHERE `user_id` = ?', [req.user.id]))[0];
      if (patient) {
        orders = orders.filter(o => o.patient_id === patient.id);
      }
    }

    res.json({
      success: true,
      data: orders,
      orders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve lab orders: ' + err.message });
  }
}

async function createOrder(req, res) {
  try {
    const { patient_id, test_id, doctor_id = 1 } = req.body;

    if (!patient_id || !test_id) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and Diagnostic Test ID are required.'
      });
    }

    const orderCode = `ORD-2026-${Math.floor(100 + Math.random() * 900)}`;

    const result = await db.query(
      'INSERT INTO `lab_orders` (`order_code`, `patient_id`, `doctor_id`, `test_id`) VALUES (?, ?, ?, ?)',
      [orderCode, patient_id, doctor_id, test_id]
    );

    res.status(201).json({
      success: true,
      message: `Diagnostic test order ${orderCode} generated successfully.`,
      orderId: result.insertId,
      orderCode
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create lab order: ' + err.message });
  }
}

async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const { status, results, technician_name, verified_by } = req.body;

    const result = await db.query(
      'UPDATE `lab_orders` SET `status` = ?, `results` = ?, `technician_name` = ?, `verified_by` = ? WHERE `id` = ?',
      [status, results, technician_name, verified_by, id]
    );

    res.json({
      success: true,
      message: `Diagnostic order updated successfully. Status: [${status}].`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update lab order: ' + err.message });
  }
}

module.exports = {
  getTests,
  getOrders,
  createOrder,
  updateOrder
};
