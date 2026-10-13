/**
 * Automated Database Setup & Seeder Script
 * Connects to MySQL, executes schema.sql, hashes passwords with bcrypt, and seeds initial hospital data.
 * Run with: npm run setup-db
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupDatabase() {
  console.log('====================================================');
  console.log('  Hospital Management System - Database Provisioning');
  console.log('====================================================\n');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;
  try {
    console.log(`[1/4] Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('      Connected successfully!\n');

    // Create database if not exists
    const dbName = process.env.DB_NAME || 'hospital_management_db';
    console.log(`[2/4] Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`      Active database set to '${dbName}'.\n`);

    // Execute schema.sql
    console.log('[3/4] Applying relational schema definitions (schema.sql)...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('      Relational tables created: users, departments, doctors, patients, appointments, medical_records, prescriptions, staff, billing, payments.\n');

    // Execute seed.sql with fresh bcrypt hashes
    console.log('[4/4] Seeding initial production-grade demo data (seed.sql)...');
    const seedPath = path.join(__dirname, '../database/seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8');

    // Generate accurate bcrypt hash for default demo password
    const demoHash = await bcrypt.hash('Password@123', 10);
    seedSql = seedSql.replace(/\$2a\$10\$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4/g, demoHash);

    await connection.query(seedSql);
    console.log('      Demo doctors, departments, patients, appointments, and invoices seeded!\n');

    console.log('====================================================');
    console.log('  Database setup completed successfully! 🎉');
    console.log('====================================================');
    console.log('Demo Credentials for Testing:');
    console.log('  - Administrator : admin@hospital.org      | Password@123');
    console.log('  - Cardiologist  : dr.sharma@hospital.org  | Password@123');
    console.log('  - Receptionist  : receptionist@hospital.org | Password@123');
    console.log('  - Patient       : arun@example.com        | Password@123\n');
  } catch (err) {
    console.error('\n[Database Provisioning Failed]:', err.message);
    console.log('\nNote: If MySQL is not currently running locally, the application automatically');
    console.log('falls back to its internal in-memory store so all features remain functional!\n');
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
