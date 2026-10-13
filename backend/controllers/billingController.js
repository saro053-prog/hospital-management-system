/**
 * Billing & Invoicing Controller
 * Handles hospital invoices, discounts, taxes, and payment settlements
 */

const db = require('../config/db');

async function getAllInvoices(req, res) {
  try {
    const { status, patient_id } = req.query;
    let invoices = await db.query('SELECT * FROM `billing` ORDER BY `id` DESC');

    if (status) {
      invoices = invoices.filter(i => i.payment_status.toLowerCase() === status.toLowerCase());
    }

    if (patient_id) {
      invoices = invoices.filter(i => i.patient_id === parseInt(patient_id));
    }

    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve invoices: ' + err.message });
  }
}

async function createInvoice(req, res) {
  try {
    const { patient_id, appointment_id, total_amount, discount_amount, tax_amount, notes } = req.body;

    if (!patient_id || !total_amount) {
      return res.status(400).json({ success: false, message: 'Patient ID and Total Amount are required.' });
    }

    const total = parseFloat(total_amount);
    const discount = parseFloat(discount_amount || 0);
    const tax = parseFloat(tax_amount || 0);
    const net = Math.max(0, total - discount + tax);

    const invoice_number = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoice_date = new Date().toISOString().split('T')[0];
    const due_date = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO \`billing\`
        (\`invoice_number\`, \`patient_id\`, \`appointment_id\`, \`total_amount\`, \`discount_amount\`, \`tax_amount\`, \`net_amount\`, \`payment_status\`, \`invoice_date\`, \`due_date\`, \`notes\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Unpaid', ?, ?, ?)`,
      [invoice_number, patient_id, appointment_id || null, total, discount, tax, net, invoice_date, due_date, notes || '']
    );

    res.status(201).json({
      success: true,
      message: `Invoice ${invoice_number} generated successfully!`,
      data: {
        id: result.insertId || Date.now(),
        invoice_number,
        net_amount: net,
        payment_status: 'Unpaid'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create invoice: ' + err.message });
  }
}

async function recordPayment(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { payment_method, amount_paid } = req.body;

    if (!payment_method) {
      return res.status(400).json({ success: false, message: 'Payment method is required.' });
    }

    const txnRef = `TXN-${payment_method.toUpperCase()}-${Date.now().toString().slice(-6)}`;

    // Update billing record to Paid
    await db.query('UPDATE `billing` SET `payment_status` = "Paid" WHERE `id` = ?', [id]);

    // Record payment
    await db.query(
      `INSERT INTO \`payments\`
        (\`billing_id\`, \`transaction_reference\`, \`amount_paid\`, \`payment_method\`, \`processed_by_user_id\`)
      VALUES (?, ?, ?, ?, ?)`,
      [id, txnRef, amount_paid || 1000.00, payment_method, req.user ? req.user.id : 1]
    );

    res.json({
      success: true,
      message: `Payment of ₹${amount_paid} received via ${payment_method}. Transaction Ref: ${txnRef}.`,
      transaction_reference: txnRef
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record payment: ' + err.message });
  }
}

module.exports = {
  getAllInvoices,
  createInvoice,
  recordPayment
};
