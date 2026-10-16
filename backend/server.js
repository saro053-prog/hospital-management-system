/**
 * Hospital Management System (HMS) - REST API Server
 * Built with Node.js, Express, MySQL 8.0 / Resilient Fallback, and Strict JWT Authentication.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initDb } = require('./config/db');

// Modular REST API routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const recordRoutes = require('./routes/records');
const billingRoutes = require('./routes/billing');
const statsRoutes = require('./routes/stats');
const nurseRoutes = require('./routes/nurses');
const labRoutes = require('./routes/laboratory');
const wardRoutes = require('./routes/wards');
const pharmacyRoutes = require('./routes/pharmacy');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts & external CDNs for fonts & icons
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static frontend delivery
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Hospital Management System API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/nurses', nurseRoutes);
app.use('/api/laboratory', labRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// Fallback to SPA index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  🏥 Hospital Management System (HMS) Enterprise Server`);
    console.log(`  🚀 Live on: http://localhost:${PORT}`);
    console.log(`  📡 REST API: http://localhost:${PORT}/api/health`);
    console.log(`================================================================`);
  });
}

startServer();

module.exports = app;
